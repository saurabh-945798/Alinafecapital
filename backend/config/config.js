import dns from "node:dns";
import mongoose from "mongoose";

const DEFAULT_DNS_SERVERS = ["1.1.1.1", "8.8.8.8"];

// Standard seed-list hosts observed for the uploaded Alinafe Capital Atlas cluster.
// Override with MONGO_FALLBACK_HOSTS in backend/.env if Atlas gives you different hosts.
const DEFAULT_ATLAS_FALLBACK_HOSTS = [
  "ac-er2jxq4-shard-00-00.b6nt2d9.mongodb.net:27017",
  "ac-er2jxq4-shard-00-01.b6nt2d9.mongodb.net:27017",
  "ac-er2jxq4-shard-00-02.b6nt2d9.mongodb.net:27017",
];

const splitCsv = (value, fallback = []) => {
  const items = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : fallback;
};

export const configureNodeDns = () => {
  const servers = splitCsv(process.env.DNS_SERVERS, DEFAULT_DNS_SERVERS);

  try {
    dns.setServers(servers);
    console.log(`DNS resolvers configured for Node.js: ${servers.join(", ")}`);
  } catch (error) {
    console.warn(`Could not configure custom DNS resolvers: ${error?.message || error}`);
  }
};

export const isSrvDnsError = (error) => {
  let current = error;

  for (let depth = 0; current && depth < 6; depth += 1) {
    const code = String(current.code || "").toUpperCase();
    const syscall = String(current.syscall || "").toLowerCase();
    const message = String(current.message || "").toLowerCase();

    if (
      syscall === "querysrv" ||
      message.includes("querysrv") ||
      ["ECONNREFUSED", "ENOTFOUND", "ETIMEOUT", "ESERVFAIL", "EREFUSED"].includes(code)
    ) {
      return true;
    }

    current = current.cause;
  }

  return false;
};

export const buildStandardMongoUri = (srvUri, hosts) => {
  const parsed = new URL(srvUri);

  if (parsed.protocol !== "mongodb+srv:") {
    return srvUri;
  }

  if (!hosts.length) {
    throw new Error("MongoDB fallback hosts are empty. Add MONGO_FALLBACK_HOSTS to backend/.env.");
  }

  const username = parsed.username;
  const password = parsed.password;
  const credentials = username ? `${username}${password ? `:${password}` : ""}@` : "";
  const databasePath = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "/";
  const params = new URLSearchParams(parsed.searchParams);

  if (!params.has("authSource")) params.set("authSource", "admin");
  params.set("tls", "true");

  const query = params.toString();
  return `mongodb://${credentials}${hosts.join(",")}${databasePath}${query ? `?${query}` : ""}`;
};

const connectionOptions = {
  serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 15000),
  connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 15000),
  socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
  maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
  minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 0),
  family: 4,
};

const connectWithUri = async (uri) => mongoose.connect(uri, connectionOptions);

export const connectDB = async () => {
  const mongoUri = String(process.env.MONGO_URI || "").trim();

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing from backend/.env");
  }

  configureNodeDns();

  try {
    const conn = await connectWithUri(mongoUri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    const isSrvUri = mongoUri.startsWith("mongodb+srv://");

    if (!isSrvUri || !isSrvDnsError(error)) {
      throw error;
    }

    console.warn("MongoDB Atlas SRV lookup was refused by Node.js. Retrying with the standard Atlas seed list...");

    await mongoose.disconnect().catch(() => {});

    const explicitFallbackUri = String(process.env.MONGO_FALLBACK_URI || "").trim();
    const fallbackHosts = splitCsv(process.env.MONGO_FALLBACK_HOSTS, DEFAULT_ATLAS_FALLBACK_HOSTS);
    const fallbackUri = explicitFallbackUri || buildStandardMongoUri(mongoUri, fallbackHosts);

    const conn = await connectWithUri(fallbackUri);
    console.log(`MongoDB connected through DNS-SRV fallback: ${conn.connection.host}`);
    return conn;
  }
};
