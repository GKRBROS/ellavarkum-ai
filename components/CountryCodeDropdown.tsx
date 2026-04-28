import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const getFlagEmoji = (isoCode: string) => {
  return isoCode
    .toUpperCase()
    .replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

// Reference: https://countrycode.org/ and libphonenumber
const countryCodes = [
  { code: "+1", country: "United States", iso: "US" },
  { code: "+7", country: "Russia", iso: "RU" },
  { code: "+20", country: "Egypt", iso: "EG" },
  { code: "+27", country: "South Africa", iso: "ZA" },
  { code: "+30", country: "Greece", iso: "GR" },
  { code: "+31", country: "Netherlands", iso: "NL" },
  { code: "+32", country: "Belgium", iso: "BE" },
  { code: "+33", country: "France", iso: "FR" },
  { code: "+34", country: "Spain", iso: "ES" },
  { code: "+36", country: "Hungary", iso: "HU" },
  { code: "+39", country: "Italy", iso: "IT" },
  { code: "+40", country: "Romania", iso: "RO" },
  { code: "+41", country: "Switzerland", iso: "CH" },
  { code: "+43", country: "Austria", iso: "AT" },
  { code: "+44", country: "United Kingdom", iso: "GB" },
  { code: "+45", country: "Denmark", iso: "DK" },
  { code: "+46", country: "Sweden", iso: "SE" },
  { code: "+47", country: "Norway", iso: "NO" },
  { code: "+48", country: "Poland", iso: "PL" },
  { code: "+49", country: "Germany", iso: "DE" },
  { code: "+51", country: "Peru", iso: "PE" },
  { code: "+52", country: "Mexico", iso: "MX" },
  { code: "+53", country: "Cuba", iso: "CU" },
  { code: "+54", country: "Argentina", iso: "AR" },
  { code: "+55", country: "Brazil", iso: "BR" },
  { code: "+56", country: "Chile", iso: "CL" },
  { code: "+57", country: "Colombia", iso: "CO" },
  { code: "+58", country: "Venezuela", iso: "VE" },
  { code: "+60", country: "Malaysia", iso: "MY" },
  { code: "+61", country: "Australia", iso: "AU" },
  { code: "+62", country: "Indonesia", iso: "ID" },
  { code: "+63", country: "Philippines", iso: "PH" },
  { code: "+64", country: "New Zealand", iso: "NZ" },
  { code: "+65", country: "Singapore", iso: "SG" },
  { code: "+66", country: "Thailand", iso: "TH" },
  { code: "+81", country: "Japan", iso: "JP" },
  { code: "+82", country: "South Korea", iso: "KR" },
  { code: "+84", country: "Vietnam", iso: "VN" },
  { code: "+86", country: "China", iso: "CN" },
  { code: "+90", country: "Turkey", iso: "TR" },
  { code: "+91", country: "India", iso: "IN" },
  { code: "+92", country: "Pakistan", iso: "PK" },
  { code: "+93", country: "Afghanistan", iso: "AF" },
  { code: "+94", country: "Sri Lanka", iso: "LK" },
  { code: "+95", country: "Myanmar", iso: "MM" },
  { code: "+98", country: "Iran", iso: "IR" },
  { code: "+212", country: "Morocco", iso: "MA" },
  { code: "+213", country: "Algeria", iso: "DZ" },
  { code: "+216", country: "Tunisia", iso: "TN" },
  { code: "+218", country: "Libya", iso: "LY" },
  { code: "+220", country: "Gambia", iso: "GM" },
  { code: "+221", country: "Senegal", iso: "SN" },
  { code: "+222", country: "Mauritania", iso: "MR" },
  { code: "+223", country: "Mali", iso: "ML" },
  { code: "+224", country: "Guinea", iso: "GN" },
  { code: "+225", country: "Ivory Coast", iso: "CI" },
  { code: "+226", country: "Burkina Faso", iso: "BF" },
  { code: "+227", country: "Niger", iso: "NE" },
  { code: "+228", country: "Togo", iso: "TG" },
  { code: "+229", country: "Benin", iso: "BJ" },
  { code: "+230", country: "Mauritius", iso: "MU" },
  { code: "+231", country: "Liberia", iso: "LR" },
  { code: "+232", country: "Sierra Leone", iso: "SL" },
  { code: "+233", country: "Ghana", iso: "GH" },
  { code: "+234", country: "Nigeria", iso: "NG" },
  { code: "+235", country: "Chad", iso: "TD" },
  { code: "+236", country: "Central African Republic", iso: "CF" },
  { code: "+237", country: "Cameroon", iso: "CM" },
  { code: "+238", country: "Cape Verde", iso: "CV" },
  { code: "+239", country: "Sao Tome and Principe", iso: "ST" },
  { code: "+240", country: "Equatorial Guinea", iso: "GQ" },
  { code: "+241", country: "Gabon", iso: "GA" },
  { code: "+242", country: "Congo", iso: "CG" },
  { code: "+243", country: "Congo (DRC)", iso: "CD" },
  { code: "+244", country: "Angola", iso: "AO" },
  { code: "+245", country: "Guinea-Bissau", iso: "GW" },
  { code: "+248", country: "Seychelles", iso: "SC" },
  { code: "+249", country: "Sudan", iso: "SD" },
  { code: "+250", country: "Rwanda", iso: "RW" },
  { code: "+251", country: "Ethiopia", iso: "ET" },
  { code: "+252", country: "Somalia", iso: "SO" },
  { code: "+253", country: "Djibouti", iso: "DJ" },
  { code: "+254", country: "Kenya", iso: "KE" },
  { code: "+255", country: "Tanzania", iso: "TZ" },
  { code: "+256", country: "Uganda", iso: "UG" },
  { code: "+257", country: "Burundi", iso: "BI" },
  { code: "+258", country: "Mozambique", iso: "MZ" },
  { code: "+260", country: "Zambia", iso: "ZM" },
  { code: "+261", country: "Madagascar", iso: "MG" },
  { code: "+263", country: "Zimbabwe", iso: "ZW" },
  { code: "+264", country: "Namibia", iso: "NA" },
  { code: "+265", country: "Malawi", iso: "MW" },
  { code: "+266", country: "Lesotho", iso: "LS" },
  { code: "+267", country: "Botswana", iso: "BW" },
  { code: "+268", country: "Swaziland", iso: "SZ" },
  { code: "+269", country: "Comoros", iso: "KM" },
  { code: "+291", country: "Eritrea", iso: "ER" },
  { code: "+297", country: "Aruba", iso: "AW" },
  { code: "+298", country: "Faroe Islands", iso: "FO" },
  { code: "+299", country: "Greenland", iso: "GL" },
  { code: "+350", country: "Gibraltar", iso: "GI" },
  { code: "+351", country: "Portugal", iso: "PT" },
  { code: "+352", country: "Luxembourg", iso: "LU" },
  { code: "+353", country: "Ireland", iso: "IE" },
  { code: "+354", country: "Iceland", iso: "IS" },
  { code: "+355", country: "Albania", iso: "AL" },
  { code: "+356", country: "Malta", iso: "MT" },
  { code: "+357", country: "Cyprus", iso: "CY" },
  { code: "+358", country: "Finland", iso: "FI" },
  { code: "+359", country: "Bulgaria", iso: "BG" },
  { code: "+370", country: "Lithuania", iso: "LT" },
  { code: "+371", country: "Latvia", iso: "LV" },
  { code: "+372", country: "Estonia", iso: "EE" },
  { code: "+373", country: "Moldova", iso: "MD" },
  { code: "+374", country: "Armenia", iso: "AM" },
  { code: "+375", country: "Belarus", iso: "BY" },
  { code: "+376", country: "Andorra", iso: "AD" },
  { code: "+377", country: "Monaco", iso: "MC" },
  { code: "+378", country: "San Marino", iso: "SM" },
  { code: "+380", country: "Ukraine", iso: "UA" },
  { code: "+381", country: "Serbia", iso: "RS" },
  { code: "+382", country: "Montenegro", iso: "ME" },
  { code: "+385", country: "Croatia", iso: "HR" },
  { code: "+386", country: "Slovenia", iso: "SI" },
  { code: "+387", country: "Bosnia and Herzegovina", iso: "BA" },
  { code: "+389", country: "North Macedonia", iso: "MK" },
  { code: "+420", country: "Czech Republic", iso: "CZ" },
  { code: "+421", country: "Slovakia", iso: "SK" },
  { code: "+423", country: "Liechtenstein", iso: "LI" },
  { code: "+501", country: "Belize", iso: "BZ" },
  { code: "+502", country: "Guatemala", iso: "GT" },
  { code: "+503", country: "El Salvador", iso: "SV" },
  { code: "+504", country: "Honduras", iso: "HN" },
  { code: "+505", country: "Nicaragua", iso: "NI" },
  { code: "+506", country: "Costa Rica", iso: "CR" },
  { code: "+507", country: "Panama", iso: "PA" },
  { code: "+509", country: "Haiti", iso: "HT" },
  { code: "+591", country: "Bolivia", iso: "BO" },
  { code: "+592", country: "Guyana", iso: "GY" },
  { code: "+593", country: "Ecuador", iso: "EC" },
  { code: "+595", country: "Paraguay", iso: "PY" },
  { code: "+597", country: "Suriname", iso: "SR" },
  { code: "+598", country: "Uruguay", iso: "UY" },
];

export default function CountryCodeDropdown({ onSelect }: { onSelect: (code: string) => void }) {
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState({ code: "+91", country: "India", iso: "IN" });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = countryCodes.filter(c =>
    c.country.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search)
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="h-full px-3 sm:px-5 py-4 rounded-full border border-slate-200 bg-white hover:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all flex items-center gap-1.5 sm:gap-3 min-w-[90px] sm:min-w-[120px] justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{getFlagEmoji(selected.iso)}</span>
          <span className="font-bold text-slate-700">{selected.code}</span>
        </div>
        <svg 
          className={`w-4 h-4 text-slate-400 transition-transform ${show ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[60] mt-2 w-72 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-[24px] shadow-2xl overflow-hidden"
          >
            <div className="p-3 border-b border-slate-100">
              <input
                type="text"
                autoFocus
                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                placeholder="Search country..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div className="max-h-[450px] overflow-y-auto p-1 custom-scrollbar">
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm italic">No results found</div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.code + c.country}
                    type="button"
                    onClick={() => {
                      setSelected(c);
                      onSelect(c.code);
                      setShow(false);
                      setSearch("");
                    }}
                    className="w-full flex items-center justify-between p-3 hover:bg-blue-50 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getFlagEmoji(c.iso)}</span>
                      <span className="text-sm font-medium text-slate-600 group-hover:text-blue-700">{c.country}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-400 group-hover:text-blue-500 bg-slate-50 px-2 py-1 rounded-lg">{c.code}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
