import {
  APIGatewayRequestAuthorizerEvent,
  APIGatewayAuthorizerEvent,
  PolicyDocument,
  APIGatewayProxyEvent,
} from "aws-lambda";
import { JwtPayload } from 'jsonwebtoken';
import axios from "axios"
import jwt from 'jsonwebtoken'
import jwkToPem from "jwk-to-pem";
import exp from "constants";

export type CookieMap = { [key: string]: string } | undefined;
export type JwtToken = { sub: string; email: string } | null;
export type Jwk = {
  keys: {
    alg: string;
    e: string;
    kid: string;
    kty: string;
    n: string;
    use: string;
  }[];
};

export const parseCookies = (
  event: APIGatewayRequestAuthorizerEvent | APIGatewayProxyEvent
) => {
  if (!event.headers || !event.headers.Cookie) {
    return undefined;
  }

  const cookiesStr = event.headers.Cookie;
  const cookiesArr = cookiesStr.split(";");

  const cookieMap: CookieMap = {};

  for (let cookie of cookiesArr) {
    const cookieSplit = cookie.trim().split("=");
    cookieMap[cookieSplit[0]] = cookieSplit[1];
  }

  return cookieMap;
};

export const verifyToken = async (
  token: string,
  userPoolId: string | undefined,
  region: string
): Promise<JwtToken> => {
  try {
    const url = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    const { data }: { data: Jwk } = await axios.get(url);
    const pem = jwkToPem(data.keys[0] as unknown as jwkToPem.RSA);

    const decoded = jwt.verify(token, pem, { algorithms: ["RS256"] }) as JwtPayload;

    if (typeof decoded === 'object' && 'sub' in decoded) {
      return { sub: decoded.sub as string, email: decoded.email ?? '' };
    }
  } catch (err) {
    console.log(err);
  }
  return null;
};

export const createPolicy = (
  event: APIGatewayAuthorizerEvent,
  effect: string
): PolicyDocument => {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: effect,
        Action: "execute-api:Invoke",
        Resource: [event.methodArn],
      },
    ],
  };
};

export const apiResponses = {
  _200: (body: { [key: string]: any }) => {
      return {
          statusCode: 200,
          body: JSON.stringify(body, null, 2),
      };
  },
  _400: (body: { [key: string]: any }) => {
      return {
          statusCode: 400,
          body: JSON.stringify(body, null, 2),
      };
  },
};