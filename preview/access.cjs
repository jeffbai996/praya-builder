// A proxy origin adds one exact authority; it never changes the loopback bind.
function allowedHosts(port, origin='') {
  const hosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
  if(!origin) return hosts;
  let url;
  try {url=new URL(origin);} catch {throw Error('Invalid PREVIEW_PUBLIC_ORIGIN');}
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash
      || !/^[a-z0-9.-]+$/.test(url.hostname)||url.hostname.includes('..'))
    throw Error('PREVIEW_PUBLIC_ORIGIN must be an exact HTTPS origin without a path or credentials');
  hosts.add(url.host);
  return hosts;
}
module.exports={allowedHosts};
