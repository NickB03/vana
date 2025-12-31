export const REACT_EXPORT_NAMES = [
  "useState",
  "useEffect",
  "useRef",
  "useMemo",
  "useCallback",
  "useContext",
  "createContext",
  "createElement",
  "Fragment",
  "memo",
  "forwardRef",
  "useReducer",
  "useLayoutEffect",
  "useImperativeHandle",
  "useDebugValue",
  "useDeferredValue",
  "useTransition",
  "useId",
  "useSyncExternalStore",
  "useInsertionEffect",
  "lazy",
  "Suspense",
  "startTransition",
  "Children",
  "cloneElement",
  "isValidElement",
  "createRef",
  "Component",
  "PureComponent",
  "StrictMode",
] as const;

const REACT_EXPORT_LIST = REACT_EXPORT_NAMES.join(",");

const REACT_DOM_EXPORT_NAMES = [
  "createRoot",
  "hydrateRoot",
  "createPortal",
  "flushSync",
  "findDOMNode",
  "unmountComponentAtNode",
  "render",
  "hydrate",
  "unstable_batchedUpdates",
] as const;

const REACT_DOM_CLIENT_EXPORT_NAMES = [
  "createRoot",
  "hydrateRoot",
  "createPortal",
  "flushSync",
  "unstable_batchedUpdates",
] as const;

export const REACT_SHIM = `data:text/javascript,if(!window.React){throw new Error("React failed to load. Please refresh the page.")}const R=window.React;export default R;export const{${REACT_EXPORT_LIST}}=R;`;
export const REACT_DOM_SHIM = `data:text/javascript,if(!window.ReactDOM){throw new Error("ReactDOM failed to load. Please refresh the page.")}const D=window.ReactDOM;export default D;export const{${REACT_DOM_EXPORT_NAMES.join(",")}}=D;`;
export const REACT_DOM_CLIENT_SHIM = `data:text/javascript,if(!window.ReactDOM){throw new Error("ReactDOM failed to load. Please refresh the page.")}const D=window.ReactDOM;export default D;export const{${REACT_DOM_CLIENT_EXPORT_NAMES.join(",")}}=D;`;
export const JSX_RUNTIME_SHIM = `data:text/javascript,if(!window.React){throw new Error("React failed to load (jsx-runtime). Please refresh the page.")}const R=window.React;const Fragment=R.Fragment;const jsx=(type,props,key)=>R.createElement(type,{...props,key});const jsxs=jsx;export{jsx,jsxs,Fragment};`;
