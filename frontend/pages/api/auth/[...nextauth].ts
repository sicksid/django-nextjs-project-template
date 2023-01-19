import NextAuth, {Session, User, SessionStrategy} from "next-auth";
import jwtDecode from "jwt-decode";
import CredentialsProvider from "next-auth/providers/credentials";
// @ts-ignore
import {AuthApi, Configuration, TokenRefresh} from '@/client';

const authApi = new AuthApi(new Configuration({basePath: process.env.NEXT_PUBLIC_BACKEND_BASE_PATH}));

interface CustomSession extends Session {
    access?: string;
    refresh?: string;
    exp?: number;
}

interface Token {
    access?: string;
    refresh?: string;
    user?: User;
    exp?: number;
}
async function refreshAccessToken(token: Token) {
        const {data} = await authApi.createTokenRefresh(token?.refresh as unknown as TokenRefresh);
        const {exp}: Token = jwtDecode(data.access as string);
        return {
            ...token,
            ...data,
            exp,
        };
}

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
export const authOptions = {
    // https://next-auth.js.org/configuration/providers/oauth
    providers: [
        CredentialsProvider({
            // The name to display on the sign-in form (e.g. 'Sign in with...')
            name: "Project Template",
            // The credentials is used to generate a suitable form on the sign-in page.
            // You can specify whatever fields you are expecting to be submitted.
            // e.g. domain, username, password, 2FA token, etc.
            credentials: {
                username: {
                    label: "Username",
                    type: "username",
                    placeholder: "username",
                },
                password: {label: "Password", type: "password"},
            },

            async authorize(credentials) {
                try {
                    const response = await authApi.createTokenObtainPair(credentials);
                    const {data} = response
                    const token: Token = data as unknown as Token;
                    const {user_id}: any =
                        jwtDecode(token?.access as string);
                    return {
                        ...token,
                        id: user_id,
                    };
                } catch (error) {
                    console.warn(error);
                    return null;
                }
            },
        }),
    ],
    theme: {
        colorScheme: "dark",
    },
    callbacks: {
        async redirect({url, baseUrl}: { url: string; baseUrl: string }) {
            return url.startsWith(baseUrl)
                ? Promise.resolve(url)
                : Promise.resolve(baseUrl);
        },
        async jwt({
                      token,
                      user,
                      account,
                  }: { token: { exp: number }; user: User; account: any; profile: any; isNewUser: boolean }) {
            // initial signin
            if (account && user) {
                return user;
            }

            // Return previous token if the access token has not expired
            if (Date.now() < token.exp * 100) {
                return token;
            }

            // refresh token
            return refreshAccessToken(token);
        },
        async session({
                          session,
                          token
                      }: { session: CustomSession, user: User, token: Token }) {
            session.user = token.user;
            session.access = token.access;
            session.refresh = token.refresh;
            session.exp = token.exp;
            return session;
        },
    },
    session: {
        strategy: "jwt" as SessionStrategy,
    },
};

// @ts-ignore
export default NextAuth(authOptions);