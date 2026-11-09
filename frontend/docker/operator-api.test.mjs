import assert from "node:assert/strict";
import { test } from "node:test";
import { operatorApiProxyConfig } from "./operator-api.mjs";

test("public local reads are always proxied; optional transaction APIs default off", () => {
  const config = operatorApiProxyConfig({});
  assert.equal((config.match(/return 404/g) || []).length, 2);
  assert.equal((config.match(/proxy_pass/g) || []).length, 1);
  assert.match(config, /performance\|round-pool\|operator-config/);
});

test("bet and swap routes can be enabled independently", () => {
  for (const name of ["ENDUSER_BET_API_ENABLED", "ENDUSER_SWAP_API_ENABLED"]) {
    const config = operatorApiProxyConfig({ [name]: "true" });
    const path = name === "ENDUSER_BET_API_ENABLED" ? "bets" : "swap";
    const enabled = config.split(`location ^~ /api/v1/${path}/ {`)[1].split("}")[0];
    assert.match(enabled, /proxy_pass \$operator_api\$request_uri;/);
    assert.equal((config.match(/return 404/g) || []).length, 1);
    assert.match(config, /proxy_set_header X-Forwarded-For \$remote_addr;/);
    assert.match(config, /proxy_set_header CF-Connecting-IP "";/);
    assert.match(config, /limit_req_status 429;/);
    assert.equal(config.includes("proxy_add_x_forwarded_for"), false);
  }
});

test("only explicit configured proxy addresses can affect the client IP", () => {
  const config = operatorApiProxyConfig({ OPERATOR_TRUSTED_PROXY_CIDRS: "172.20.0.5/32,2001:db8::/32" });
  assert.match(config, /set_real_ip_from 172\.20\.0\.5\/32;/);
  assert.match(config, /real_ip_recursive on;/);
  assert.equal(operatorApiProxyConfig({}).includes("set_real_ip_from"), false);
  for (const value of ["0.0.0.0/0", "::/0", "172.20.0.5; include /etc/passwd;", "172.20.0.5/33", "example.com"]) {
    assert.throws(() => operatorApiProxyConfig({ OPERATOR_TRUSTED_PROXY_CIDRS: value }), /OPERATOR_TRUSTED_PROXY_CIDRS/);
  }
});

test("invalid API flags fail configuration rather than enabling routes", () => {
  assert.throws(() => operatorApiProxyConfig({ ENDUSER_SWAP_API_ENABLED: "yes" }), /ENDUSER_SWAP_API_ENABLED/);
});
