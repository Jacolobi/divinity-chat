# divinity-chat

## Quick start

Prerequisites
- Node.js or Docker
- Git

Clone directory
```bash
git clone https://github.com/your-org/divinity-chat.git
cd divinity-chat
```

Add mistral API key to environment
```bash
cp .env.example .env
# edit .env to set API key
```

Running it on Node.js
```bash
# install
npm install
# run dev server
npm run dev
```

Docker
```bash
docker build -t divinity-chat .
docker run -p 3000:3000 --env-file .env divinity-chat
```

Open http://localhost:3000 in your browser