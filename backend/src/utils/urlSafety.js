const { URL } = require('url');
const net = require('net');

exports.isSafeUrl = (urlString) => {
  try {
    const url = new URL(urlString);
    
    // Only allow HTTP/HTTPS
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    // Reject localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return false;
    }

    // Reject IP addresses if they are private or loopback
    if (net.isIPv4(hostname)) {
      const parts = hostname.split('.').map(Number);
      if (
        parts[0] === 10 || // 10.x.x.x
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || // 172.16.x.x - 172.31.x.x
        (parts[0] === 192 && parts[1] === 168) || // 192.168.x.x
        parts[0] === 127 || // 127.x.x.x
        parts[0] === 169 && parts[1] === 254 // Link-local
      ) {
        return false;
      }
    }

    if (net.isIPv6(hostname)) {
      if (hostname === '::1' || hostname.startsWith('fe80:')) {
        return false;
      }
    }

    return true;
  } catch (err) {
    return false;
  }
};
