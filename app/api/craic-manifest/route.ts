import { NextResponse } from 'next/server';

const craicManifest = {
  "frame": {
    "version": "1",
    "name": "Craic Protocol Poker",
    "homeUrl": "https://craicprotocol.com",
    "iconUrl": "https://craicprotocol.com/icon.png",
    "splashImageUrl": "https://craicprotocol.com/splash.png",
    "splashBackgroundColor": "#0a0a0a",
    "webhookUrl": "https://craicprotocol.com/api/webhook",
    "subtitle": "Trustless poker for web3",
    "description": "Host trustless poker home games for your community with zero fees and smart contract payouts",
    "primaryCategory": "games",
    "tags": [
      "poker",
      "gaming",
      "web3",
      "base",
      "tournament"
    ],
    "heroImageUrl": "https://craicprotocol.com/image.png",
    "tagline": "Trustless poker for web3",
    "ogTitle": "Craic Protocol Poker",
    "ogDescription": "Host trustless poker home games for your community with zero fees and smart contract payouts",
    "ogImageUrl": "https://craicprotocol.com/image.png",
    "screenshotUrls": [],
    "castShareUrl": "https://craicprotocol.com/share"
  },
  "accountAssociation": {
    "header": "eyJmaWQiOjIzODE2OSwidHlwZSI6ImF1dGgiLCJrZXkiOiIweERDOTk0M2Q2MTM2ZjhFMDNlZTRCN2U5NjliODEwMDJBQkMzQTQyMUMifQ",
    "payload": "eyJkb21haW4iOiJjcmFpY3Byb3RvY29sLmNvbSJ9",
    "signature": "IUOsw95vP1V53X16lU5p+Z4jaMhORU8ANqJcqZH1W5dP+URRa2XcaOHUkFS190LWagXzg7V9eUOvruWM4QlxQRw="
  },
  "baseBuilder": {
    "ownerAddress": "0x849c78D6C4fB87d152d1Da384c353712E4b1c1C5",
    "imageUrl": "https://craicprotocol.com/icon.png"
  }
};

export async function GET() {
  return NextResponse.json(craicManifest, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
}
