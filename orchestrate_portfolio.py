#!/usr/bin/env python3
import os, sys, subprocess, json, time, mimetypes, argparse
from pathlib import Path
import os
import boto3

aws_id = os.environ.get("AWS_ACCESS_KEY_ID")
aws_secret = os.environ.get("AWS_SECRET_ACCESS_KEY")

if not aws_id or not aws_secret:
    raise RuntimeError("AWS credentials are missing from environment variables!")

s3 = boto3.client(
    "s3",
    aws_access_key_id=aws_id,
    aws_secret_access_key=aws_secret,
    region_name=os.environ.get("AWS_REGION", "us-east-2")
)
try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None
try:
    import boto3
    from botocore.exceptions import ClientError
except Exception:
    boto3 = None
try:
    import requests
except Exception:
    requests = None

def log(msg): print(msg, flush=True)

def run(cmd, cwd=None, check=True):
    log("$ " + " ".join(cmd))
    return subprocess.run(cmd, cwd=cwd, check=check)

def require(tool, where=None):
    try:
        run([tool, "-v"], cwd=where, check=True)
    except Exception as e:
        sys.exit(f"Missing {tool}. Install it. Error: {e}")

def load_env():
    if load_dotenv:
        load_dotenv(override=False)
    env = {k: os.getenv(k, "") for k in [
        "NEXTJS_DIR",
        "FORECAST_API_BASE","MONTE_API_BASE","PORTFOLIO_API_BASE",
        "NEXT_PUBLIC_PORTFOLIO_API",
        "AWS_REGION","S3_BUCKET","S3_PREFIX","CLOUDFRONT_DISTRIBUTION_ID",
        "DRY_RUN","SKIP_NPM_CI"
    ]}
    return env

def http_get_json(url, timeout=8):
    if not requests:
        raise SystemExit("requests not installed: python3 -m pip install requests")
    r = requests.get(url, timeout=timeout)
    r.raise_for_status()
    return r.json()

def verify_services(env):
    ok = True
    checks = []
    def add(name, url):
        nonlocal ok
        try:
            data = http_get_json(url)
            checks.append((name, True, data))
        except Exception as e:
            checks.append((name, False, str(e)))
            ok = False

    fb = env["FORECAST_API_BASE"].rstrip("/") if env["FORECAST_API_BASE"] else ""
    mb = env["MONTE_API_BASE"].rstrip("/") if env["MONTE_API_BASE"] else ""
    pb = env["PORTFOLIO_API_BASE"].rstrip("/") if env["PORTFOLIO_API_BASE"] else ""

    if fb: add("forecast health", f"{fb}/health")
    if fb: add("forecast status", f"{fb}/public/status")
    if mb: add("monte health",    f"{mb}/health")
    if mb: add("monte status",    f"{mb}/public/status")
    if pb: add("portfolio tiles", f"{pb}/tiles")
    if pb: add("portfolio status",f"{pb}/status")

    for name, passed, data in checks:
        log(f"[{'OK' if passed else 'ERR'}] {name}")
        if passed:
            try:
                s = json.dumps(data, indent=2)
                log(s if len(s) < 1200 else s[:1200] + "\n...")
            except Exception:
                log(str(data)[:600])
        else:
            log(f"  -> {data}")
    return ok

def ensure_node(next_dir: Path, skip_npm_ci=False):
    require("node", where=next_dir)
    require("npm", where=next_dir)
    require("npx", where=next_dir)
    if not skip_npm_ci or not (next_dir / "node_modules").exists():
        run(["npm", "ci"], cwd=next_dir)

def write_build_env(next_dir: Path, public_api: str):
    p = next_dir / ".env.production"
    content = f"NEXT_PUBLIC_PORTFOLIO_API={public_api}\n"
    if p.exists():
        txt = p.read_text()
        if "NEXT_PUBLIC_PORTFOLIO_API=" in txt:
            lines = [l for l in txt.splitlines() if not l.startswith("NEXT_PUBLIC_PORTFOLIO_API=")]
            lines.append(content.strip())
            p.write_text("\n".join(lines) + "\n")
        else:
            p.write_text(txt + ("\n" if not txt.endswith("\n") else "") + content)
    else:
        p.write_text(content)
    log(f"wrote {p}")

def build_static(env):
    nd = env["NEXTJS_DIR"]
    if not nd: sys.exit("NEXTJS_DIR missing in .env")
    next_dir = Path(nd).expanduser()
    if not next_dir.exists(): sys.exit(f"NEXTJS_DIR not found: {next_dir}")
    public_api = env["NEXT_PUBLIC_PORTFOLIO_API"] or env["PORTFOLIO_API_BASE"]
    if not public_api:
        log("WARN: NEXT_PUBLIC_PORTFOLIO_API is empty; your site may not know where to fetch tiles.")
    ensure_node(next_dir, env.get("SKIP_NPM_CI","").lower()=="true")
    if public_api: write_build_env(next_dir, public_api)
    run(["npm","run","build"], cwd=next_dir)
    out = next_dir / "out"
    if not out.exists(): sys.exit("Build OK, but ./out not found. Ensure next.config.js has: output: 'export'")
    log(f"ok: built {out}")
    return out

def guess_headers(path: Path):
    ctype, _ = mimetypes.guess_type(str(path))
    if not ctype: ctype = "application/octet-stream"
    rel = path.as_posix()
    if rel.endswith(".html"):
        cache = "public, max-age=0, must-revalidate"
    elif ("/_next/" in rel) or any(rel.endswith(ext) for ext in [".js",".css",".png",".jpg",".jpeg",".webp",".svg",".ico",".json",".woff",".woff2"]):
        cache = "public, max-age=31536000, immutable"
    else:
        cache = "public, max-age=300"
    return ctype, cache

def s3_upload_dir(env, out_dir: Path):
    if not boto3:
        raise SystemExit("boto3 not installed: python3 -m pip install boto3")
    s3 = boto3.client("s3", region_name=env["AWS_REGION"] or "us-east-1")
    bucket = env["S3_BUCKET"]
    prefix = (env["S3_PREFIX"] or "").strip("/")
    if not bucket: sys.exit("S3_BUCKET missing in .env")
    dry = env.get("DRY_RUN","").lower()=="true"

    # ensure bucket exists
    try:
        s3.head_bucket(Bucket=bucket)
        log(f"bucket exists: s3://{bucket}")
    except ClientError:
        log(f"creating bucket: {bucket}")
        params = {"Bucket": bucket}
        if (env["AWS_REGION"] or "us-east-1") != "us-east-1":
            params["CreateBucketConfiguration"] = {"LocationConstraint": env["AWS_REGION"]}
        if not dry:
            s3.create_bucket(**params)

    uploaded = 0
    for p in out_dir.rglob("*"):
        if not p.is_file(): continue
        rel = p.relative_to(out_dir).as_posix()
        key = f"{prefix}/{rel}" if prefix else rel
        ctype, cache = guess_headers(p)
        if dry:
            log(f"[DRY] PUT s3://{bucket}/{key} ({ctype}, {cache})")
            continue
        with p.open("rb") as f:
            s3.put_object(Bucket=bucket, Key=key, Body=f.read(),
                          ContentType=ctype, CacheControl=cache)
        uploaded += 1
        if uploaded % 50 == 0: log(f"uploaded {uploaded} files...")
    log(f"uploaded total: {uploaded}")

def cf_invalidate(env):
    dist = env.get("CLOUDFRONT_DISTRIBUTION_ID","")
    if not dist:
        log("no CLOUDFRONT_DISTRIBUTION_ID set; skipping invalidate")
        return
    if not boto3:
        raise SystemExit("boto3 not installed: python3 -m pip install boto3")
    cf = boto3.client("cloudfront")
    caller = str(int(time.time()))
    if env.get("DRY_RUN","").lower()=="true":
        log(f"[DRY] CloudFront invalidate {dist} /*")
        return
    resp = cf.create_invalidation(
        DistributionId=dist,
        InvalidationBatch={"Paths":{"Quantity":1,"Items":["/*"]},
                           "CallerReference":caller}
    )
    inv_id = resp["Invalidation"]["Id"]
    log(f"created CloudFront invalidation: {inv_id}")

def fetch_tiles(env):
    pb = (env["PORTFOLIO_API_BASE"] or "").rstrip("/")
    if not pb: sys.exit("PORTFOLIO_API_BASE missing in .env")
    tiles = http_get_json(f"{pb}/tiles")
    status = http_get_json(f"{pb}/status")
    Path("snapshots").mkdir(exist_ok=True)
    Path("snapshots/tiles.json").write_text(json.dumps(tiles, indent=2))
    Path("snapshots/status.json").write_text(json.dumps(status, indent=2))
    log("wrote snapshots/tiles.json and snapshots/status.json")

def sentiment_placeholder_tile():
    tile = {
        "group":"sentiment",
        "tile":"placeholder",
        "label":"SENTIMENT",
        "value": None,
        "display":"TRAINING IN PROGRESS",
        "window":"",
        "status":"paused",
        "foot":"",
        "updated_at":None
    }
    print(json.dumps(tile, indent=2))

def main():
    env = load_env()
    ap = argparse.ArgumentParser(description="Portfolio Orchestrator (verify → build → deploy → invalidate)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("verify")
    sub.add_parser("build")
    sub.add_parser("deploy")
    sub.add_parser("invalidate")
    sub.add_parser("all")
    sub.add_parser("tiles")
    sub.add_parser("placeholder")
    args = ap.parse_args()

    if args.cmd == "verify":
        ok = verify_services(env); sys.exit(0 if ok else 2)
    elif args.cmd == "build":
        build_static(env)
    elif args.cmd == "deploy":
        nd = env["NEXTJS_DIR"]
        out_dir = Path(nd).expanduser() / "out"
        if not out_dir.exists(): sys.exit("No ./out found. Run 'build' first.")
        s3_upload_dir(env, out_dir)
    elif args.cmd == "invalidate":
        cf_invalidate(env)
    elif args.cmd == "all":
        ok = verify_services(env)
        if not ok: log("verify had failures; continuing...")
        out_dir = build_static(env)
        s3_upload_dir(env, out_dir)
        cf_invalidate(env)
    elif args.cmd == "tiles":
        fetch_tiles(env)
    elif args.cmd == "placeholder":
        sentiment_placeholder_tile()

if __name__ == "__main__":
    main()
