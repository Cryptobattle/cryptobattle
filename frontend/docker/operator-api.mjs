import { isIP } from "node:net";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

function enabled(env, name) {
  const value = env[name] || "false";
  if (!["true", "false"].includes(value)) throw new Error(`${name} must be true or false`);
  return value === "true";
}

export function operatorApiProxyConfig(env) {
  const bets = enabled(env, "ENDUSER_BET_API_ENABLED");
  const swap = enabled(env, "ENDUSER_SWAP_API_ENABLED");
  const proxies = (env.OPERATOR_TRUSTED_PROXY_CIDRS || "").split(",").map(x => x.trim()).filter(Boolean);
  const lines = [];
  for (const cidr of proxies) {
    const [address, prefix, extra] = cidr.split("/");
    const family = isIP(address);
    if (!family || extra !== undefined || (prefix !== undefined && (!/^\d+$/.test(prefix) || Number(prefix) <= 0 || Number(prefix) > (family === 4 ? 32 : 128)))) {
      throw new Error("OPERATOR_TRUSTED_PROXY_CIDRS must contain explicit IPv4/IPv6 proxy addresses or CIDRs, never a /0 network");
    }
    lines.push(`set_real_ip_from ${cidr};`);
  }
  if (proxies.length) lines.push("real_ip_header X-Forwarded-For;", "real_ip_recursive on;");
  lines.push(
    "location ~ ^/api/(performance|round-pool|operator-config)$ {",
    "  resolver 127.0.0.11 valid=10s ipv6=off;",
    "  set $operator_api http://operator-api:3001;",
    "  limit_except GET { deny all; }",
    "  proxy_connect_timeout 5s;",
    "  proxy_read_timeout 30s;",
    "  proxy_pass $operator_api$request_uri;",
    "}",
  );
  for (const [path, active] of [["bets", bets], ["swap", swap]]) {
    lines.push(`location ^~ /api/v1/${path}/ {`);
    if (active) {
      lines.push(
        "  resolver 127.0.0.11 valid=10s ipv6=off;",
        "  set $operator_api http://operator-api:3001;",
        "  limit_req zone=operator_api burst=20 nodelay;",
        "  limit_req_status 429;",
        "  client_max_body_size 32k;",
        "  proxy_connect_timeout 5s;",
        "  proxy_read_timeout 30s;",
        "  proxy_set_header Host $host;",
        // Send only Nginx's verified peer address, never a user-provided forwarding header.
        "  proxy_set_header X-Forwarded-For $remote_addr;",
        '  proxy_set_header CF-Connecting-IP "";',
        "  proxy_pass $operator_api$request_uri;",
      );
    } else {
      lines.push("  default_type application/json;", '  return 404 \'{"error":"API disabled"}\';');
    }
    lines.push("}");
  }
  return `${lines.join("\n")}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    writeFileSync(process.argv[2] || "/etc/nginx/operator-api.conf", operatorApiProxyConfig(process.env));
  } catch (error) {
    console.error(`CryptoBattle operator API configuration: ${error.message}`);
    process.exitCode = 1;
  }
}
