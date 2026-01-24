// ============================================
// Province Selector Component
// ============================================
// Dropdown để chọn tỉnh/thành phố thuộc Đồng bằng sông Cửu Long
// ============================================

import { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown } from "lucide-react";

// 13 tỉnh thành thuộc Đồng bằng sông Cửu Long
const MEKONG_DELTA_PROVINCES = [
    "An Giang",
    "Bạc Liêu",
    "Bến Tre",
    "Cà Mau",
    "Đồng Tháp",
    "Hậu Giang",
    "Kiên Giang",
    "Long An",
    "Sóc Trăng",
    "Tiền Giang",
    "Trà Vinh",
    "Vĩnh Long",
    "Cần Thơ",
];

interface ProvinceSelectorProps {
    selectedProvince: string;
    onProvinceChange: (province: string) => void;
    className?: string;
}

export function ProvinceSelector({
    selectedProvince,
    onProvinceChange,
    className = "",
}: ProvinceSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [isOpen]);

    const handleSelectProvince = (province: string) => {
        onProvinceChange(province);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 text-sm font-medium hover:bg-white/10 px-2 py-1 rounded transition-all active:scale-95"
                aria-label="Chọn tỉnh"
            >
                <MapPin className="w-4 h-4" />
                Tỉnh <span className="font-bold">{selectedProvince.toUpperCase()}</span>
                <ChevronDown
                    className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 min-w-[200px]">
                    <div className="max-h-[300px] overflow-y-auto">
                        {MEKONG_DELTA_PROVINCES.map((province) => (
                            <button
                                key={province}
                                onClick={() => handleSelectProvince(province)}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${selectedProvince === province
                                        ? "bg-blue-100 text-blue-700 font-semibold"
                                        : "text-gray-700"
                                    }`}
                            >
                                {province}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
