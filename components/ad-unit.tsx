"use client"

import { useEffect, useRef } from "react"
import { getAdSenseClient } from "@/lib/google-adsense"

interface AdUnitProps {
  className?: string
}

export function DisplayAd({ className = "" }: AdUnitProps) {
  const adRef = useRef<HTMLModElement>(null)

  useEffect(() => {
    if (adRef.current && adRef.current.getAttribute("data-adsbygoogle-status") !== "done") {
      try {
        // @ts-ignore
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (err) {
        console.error("AdSense initialization error", err)
      }
    }
  }, [])

  return (
    <div
      className={`w-full flex justify-center items-center overflow-hidden max-h-[100px] ${className}`}
      aria-hidden="true"
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", width: "100%" }}
        data-ad-client={getAdSenseClient()}
        data-ad-slot="4281962306"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}

export function InArticleAd({ className = "" }: AdUnitProps) {
  const adRef = useRef<HTMLModElement>(null)

  useEffect(() => {
    if (adRef.current && adRef.current.getAttribute("data-adsbygoogle-status") !== "done") {
      try {
        // @ts-ignore
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (err) {
        console.error("AdSense initialization error", err)
      }
    }
  }, [])

  return (
    <div
      className={`w-full flex justify-center items-center overflow-hidden max-h-[100px] ${className}`}
      aria-hidden="true"
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", textAlign: "center", width: "100%" }}
        data-ad-layout="in-article"
        data-ad-format="fluid"
        data-ad-client={getAdSenseClient()}
        data-ad-slot="1136924212"
      />
    </div>
  )
}
