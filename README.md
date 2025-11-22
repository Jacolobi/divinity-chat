# Divinity Chat

Divine the answers to your most pressing questions with Divinity Chat! Each of your messages will be answered by both an angel and a devil giving you new perspectives. Depending on the guidance you seek, different advice can be granted. Select the Good/Evil persona for questions about life, or choose Supportive/Critical if you are exploring new ideas. 

## Quick start

Prerequisites
- Node.js or Docker
- Git

Clone directory
```bash
git clone https://github.com/Jacolobi/divinity-chat.git
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

Running it with Docker
```bash
docker build -t divinity-chat .
docker run -p 3000:3000 --env-file .env divinity-chat
```

Open http://localhost:3000 in your browser
