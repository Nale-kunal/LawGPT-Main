/* eslint-disable no-console */

const isProd = import.meta.env.PROD;

// Centralized debug override check
const getIsDebugEnabled = (): boolean => {
  if (isProd) return false;
  try {
    return typeof window !== 'undefined' && 
      !!window.localStorage && 
      window.localStorage.getItem('JURIQ_DEBUG') === 'true';
  } catch {
    return false;
  }
};

const checkIsSecurityRelated = (args: any[]): boolean => {
  return args.some(arg => {
    if (typeof arg === 'string') {
      const lower = arg.toLowerCase();
      return lower.includes('security') || 
             lower.includes('csrf') || 
             lower.includes('auth') || 
             lower.includes('unauthorized') || 
             lower.includes('forbidden') || 
             lower.includes('session');
    }
    if (arg && typeof arg === 'object') {
      try {
        const str = JSON.stringify(arg).toLowerCase();
        return str.includes('security') || 
               str.includes('csrf') || 
               str.includes('auth') || 
               str.includes('unauthorized') || 
               str.includes('forbidden') || 
               str.includes('session');
      } catch {
        return false;
      }
    }
    return false;
  });
};

export const logger = {
  debug(...args: any[]) {
    if (!isProd && getIsDebugEnabled()) {
      console.debug(...args);
    }
  },
  
  log(...args: any[]) {
    if (!isProd && getIsDebugEnabled()) {
      console.log(...args);
    }
  },
  
  info(...args: any[]) {
    if (!isProd && getIsDebugEnabled()) {
      console.info(...args);
    }
  },
  
  warn(...args: any[]) {
    const isSecurity = checkIsSecurityRelated(args);
    // Warn is allowed in development, or in production only if security related
    if (!isProd || isSecurity) {
      console.warn(...args);
    }
  },
  
  error(...args: any[]) {
    // Critical errors are always allowed in both production and development for diagnostic purposes
    console.error(...args);
  },
  
  trace(...args: any[]) {
    if (!isProd && getIsDebugEnabled()) {
      console.trace(...args);
    }
  }
};
