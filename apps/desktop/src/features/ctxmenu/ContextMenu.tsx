// ContextMenu.tsx
import "../../css/contextMenu.css";
import { useEffect, useRef, useState } from "react";

export type ContextMenuSubItem = {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void | Promise<void>;
};

export type ContextMenuItem = {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void | Promise<void>;
  submenu?: ContextMenuSubItem[];
};

type Props = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

export function ContextMenu({ x, y, items, onClose }: Props) {
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={rootRef}
      className="ctxMenu"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => {
        const hasSubmenu = !!item.submenu?.length;

        return (
          <div
            key={i}
            className={[
              "ctxItem",
              item.danger ? "danger" : "",
              item.disabled ? "disabled" : "",
              hasSubmenu ? "submenuTrigger" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onMouseEnter={() => setActiveSubmenu(hasSubmenu ? i : null)}
            onClick={async () => {
              if (item.disabled || hasSubmenu || !item.onClick) return;
              await item.onClick();
              onClose();
            }}
          >
            <span>{item.label}</span>
            {hasSubmenu && <span className="submenuArrow">›</span>}

            {hasSubmenu && activeSubmenu === i && (
              <div className="ctxSubmenu">
                {item.submenu!.map((sub, j) => (
                  <button
                    key={j}
                    className={[
                      "ctxItem",
                      sub.danger ? "danger" : "",
                      sub.disabled ? "disabled" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={sub.disabled}
                    onClick={async () => {
                      if (sub.disabled || !sub.onClick) return;
                      await sub.onClick();
                      onClose();
                    }}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}