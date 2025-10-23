ORCHESTRATOR — Next.js static + live APIs (Forecast, Monte) → S3 (+ CloudFront)

What this does
--------------
1) verify   : pings your live Render APIs (forecast/monte/portfolio) for /health and /public/status
2) build    : builds Next.js and runs 'next export' → ./out
3) deploy   : uploads ./out to S3 with correct Content-Type + Cache-Control
4) invalidate (optional): CloudFront invalidation /* if you set CLOUDFRONT_DISTRIBUTION_ID
5) all      : verify → build → deploy → (invalidate if configured)
6) tiles    : pulls /tiles and /status from your Portfolio API; writes JSON snapshots
7) placeholder : outputs a SENTIMENT paused tile JSON

Requirements
------------
- Node.js 18+, npm, npx
- Python 3.10+ with: boto3, python-dotenv, requests
  python3 -m pip install boto3 python-dotenv requests
- AWS credentials configured or env vars

Quick start
-----------
cp .env.example .env   # edit values
set -a; source .env; set +a
python3 orchestrate_portfolio.py verify
python3 orchestrate_portfolio.py build
python3 orchestrate_portfolio.py deploy
python3 orchestrate_portfolio.py invalidate   # optional
python3 orchestrate_portfolio.py all
