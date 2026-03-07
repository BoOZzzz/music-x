import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";

type MenuState =
  | null
  | {
      x: number;
      y: number;
      items: ContextMenuItem[];
    };

type GlobalContextMenuValue = {
  showContextMenu: (args: { x: number; y: number; items: ContextMenuItem[] }) => void;
  closeContextMenu: () => void;
};

const GlobalContextMenuContext = createContext<GlobalContextMenuValue | null>(null);

export function GlobalContextMenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<MenuState>(null);

  const showContextMenu = useCallback(
    ({ x, y, items }: { x: number; y: number; items: ContextMenuItem[] }) => {
      setMenu({ x, y, items });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setMenu(null);
  }, []);

  const value = useMemo(
    () => ({
      showContextMenu,
      closeContextMenu,
    }),
    [showContextMenu, closeContextMenu]
  );

  return (
    <GlobalContextMenuContext.Provider value={value}>
      {children}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menu.items}
          onClose={closeContextMenu}
        />
      )}
    </GlobalContextMenuContext.Provider>
  );
}

export function useGlobalContextMenu() {
  const ctx = useContext(GlobalContextMenuContext);
  if (!ctx) {
    throw new Error("useGlobalContextMenu must be used inside GlobalContextMenuProvider");
  }
  return ctx;
}