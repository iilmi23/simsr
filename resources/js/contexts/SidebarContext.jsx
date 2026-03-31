import { createContext, useContext, useState, useEffect } from "react";

// ✅ export context juga (biar fleksibel kalau dipakai di tempat lain)
export const SidebarContext = createContext(null);

export default function SidebarProvider({ children }) {

    const [sidebarOpen, setSidebarOpen] = useState(() => {
        if (typeof window === "undefined") return true;
        const saved = localStorage.getItem("sidebarOpen");
        return saved !== null ? saved === "true" : window.innerWidth >= 1024;
    });

    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [activeItem, setActiveItem] = useState(null);
    const [openSubmenu, setOpenSubmenu] = useState(null);
    const [isMobile, setIsMobile] = useState(false);

    // ✅ simpan ke localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("sidebarOpen", sidebarOpen);
        }
    }, [sidebarOpen]);

    // ✅ handle resize
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);

            if (mobile) {
                setSidebarOpen(false);
            } else {
                setIsMobileOpen(false);
            }
        };

        handleResize();
        window.addEventListener("resize", handleResize);

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const toggleSidebar = () => setSidebarOpen(prev => !prev);
    const toggleMobileSidebar = () => setIsMobileOpen(prev => !prev);
    const toggleSubmenu = (menu) => {
        setOpenSubmenu(prev => (prev === menu ? null : menu));
    };

    return (
        <SidebarContext.Provider
            value={{
                sidebarOpen: isMobile ? false : sidebarOpen,
                isMobileOpen,
                isHovered,
                activeItem,
                openSubmenu,
                isMobile,
                toggleSidebar,
                toggleMobileSidebar,
                setIsHovered,
                setActiveItem,
                toggleSubmenu,
                setSidebarOpen
            }}
        >
            {children}
        </SidebarContext.Provider>
    );
}

// ✅ hook aman
export const useSidebar = () => {
    const context = useContext(SidebarContext);

    if (!context) {
        throw new Error("useSidebar harus dipakai di dalam SidebarProvider");
    }

    return context;
};