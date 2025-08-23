import * as React from "react"
import { safeMatchMedia, safeGetWindowDimensions } from "@/lib/ssr-utils"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Use SSR-safe initial value (false for server, actual value for client)
  const [isMobile, setIsMobile] = React.useState<boolean>(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    
    // Safely check initial mobile status
    const checkInitialState = () => {
      const dimensions = safeGetWindowDimensions()
      return dimensions.innerWidth < MOBILE_BREAKPOINT
    }
    
    setIsMobile(checkInitialState())

    // Set up media query listener
    const mql = safeMatchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    if (mql) {
      const onChange = (e: MediaQueryListEvent) => {
        setIsMobile(e.matches)
      }
      
      // Use the modern API if available, fallback to deprecated one
      if (mql.addEventListener) {
        mql.addEventListener("change", onChange)
        return () => mql.removeEventListener("change", onChange)
      } else {
        // Fallback for older browsers
        mql.addListener(onChange)
        return () => mql.removeListener(onChange)
      }
    }
    
    return () => {}
  }, [])

  // Return false on server-side to prevent hydration mismatch
  return mounted ? isMobile : false
}
