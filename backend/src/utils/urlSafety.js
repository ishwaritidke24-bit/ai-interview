const { URL } = require('url');
const net = require('net');
const dns = require('dns').promises;

// Determine if an IP address is private, loopback, or link‑local
function isPrivateIp(ip) {
  if (!net.isIP(ip)) return false;
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true; // 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
    if (parts[0] === 127) return true; // loopback
    if (parts[0] === 169 && parts[1] === 254) return true; // link‑local
    return false;
  }
  if (net.isIPv6(ip)) {
    if (ip === '::1') return true; // loopback
    const low = ip.toLowerCase();
    if (low.startsWith('fe80:')) return true; // link‑local
    if (low.startsWith('fc') || low.startsWith('fd')) return true; // unique local (ULA)
    return false;
  }
  return false;
}

// Resolve hostname and ensure all returned IPs are public
async function resolvesToPublic(hostname) {
  try {
    const records = await dns.lookup(hostname, { all: true });
    for (const rec of records) {
      if (isPrivateIp(rec.address)) return false;
    }
    return true;
  } catch (e) {
    // DNS failure treated as unsafe
    return false;
  }
}

// Exported function to check URL safety
exports.isSafeUrl = async (urlString) => {
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();

    // Reject localhost and 127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') return false;

    // If hostname is an IP address, validate directly
    if (net.isIP(hostname)) {
      return !isPrivateIp(hostname);
    }

    // Otherwise resolve DNS and ensure all addresses are public
    return await resolvesToPublic(hostname);
  } catch (err) {
    return false;
  }
};
