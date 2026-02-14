import { useRef, useEffect } from "react";
import { cn } from "../../lib/utils";

// CSS styles are expected to be in a global file or imported here if using CSS modules.
// Since User provided raw CSS, we will assume it's added to index.css or we insert a style tag.
// For best practice in this setup, I will append the styles to index.css via another tool call,
// but for the component structure:

export function SpaceButton({ children, className, onClick, ...props }) {
  return (
    <div className={cn("button-container", className)}>
      <button className="space-button" onClick={onClick} {...props}>
        <div className="bright-particles"></div>
        <span>{children}</span>
      </button>
    </div>
  );
}
