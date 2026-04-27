const ADSENSE_CLIENT = "ca-pub-9548862109530353"

export function getAdSenseClient() {
  return ADSENSE_CLIENT
}

export function getAdSenseScriptSrc() {
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${getAdSenseClient()}`
}
