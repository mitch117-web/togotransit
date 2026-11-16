import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Politique de sécurité du contenu, sur le modèle « sans nonce » de la documentation de Next.js :
// le navigateur n'accepte que les scripts, styles, images et connexions venant du site lui-même.
// Seules exceptions : la police d'icônes de Google Fonts, les images produites dans la page
// (signature, QR code, PDF) et, en développement seulement, ce dont l'outil de rechargement a besoin.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' blob: data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Le site ne peut pas être affiché dans le cadre d'un autre site (détournement de clic).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Le navigateur ne devine pas le type d'un fichier : il respecte celui qu'annonce le serveur.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Vers un autre site, seule l'adresse du site est transmise, jamais la page ni ses paramètres.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Caméra et micro inutilisés par le site ; la position ne sert qu'à la preuve de livraison du portail.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // L'app mobile (Expo/React Native) et un éventuel build web appellent
        // l'API depuis une autre origine ; les requêtes n'utilisent pas de
        // cookies (auth par Bearer token), donc une origine large est sûre ici.
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
