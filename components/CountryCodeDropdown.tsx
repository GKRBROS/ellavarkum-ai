'use client';

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Derives flag emoji from ISO 3166-1 alpha-2 country code
const getFlagEmoji = (iso: string): string => {
  return iso
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(0x1F1E6 + char.charCodeAt(0) - 65))
    .join('');
};

export interface CountryCode {
  code: string;
  country: string;
  iso: string;
}

// Complete world country dial codes list (~250 countries)
const countryCodes: CountryCode[] = [
  { code: "+93", country: "Afghanistan", iso: "AF" },
  { code: "+355", country: "Albania", iso: "AL" },
  { code: "+213", country: "Algeria", iso: "DZ" },
  { code: "+1684", country: "American Samoa", iso: "AS" },
  { code: "+376", country: "Andorra", iso: "AD" },
  { code: "+244", country: "Angola", iso: "AO" },
  { code: "+1264", country: "Anguilla", iso: "AI" },
  { code: "+672", country: "Antarctica", iso: "AQ" },
  { code: "+1268", country: "Antigua and Barbuda", iso: "AG" },
  { code: "+54", country: "Argentina", iso: "AR" },
  { code: "+374", country: "Armenia", iso: "AM" },
  { code: "+297", country: "Aruba", iso: "AW" },
  { code: "+61", country: "Australia", iso: "AU" },
  { code: "+43", country: "Austria", iso: "AT" },
  { code: "+994", country: "Azerbaijan", iso: "AZ" },
  { code: "+1242", country: "Bahamas", iso: "BS" },
  { code: "+973", country: "Bahrain", iso: "BH" },
  { code: "+880", country: "Bangladesh", iso: "BD" },
  { code: "+1246", country: "Barbados", iso: "BB" },
  { code: "+375", country: "Belarus", iso: "BY" },
  { code: "+32", country: "Belgium", iso: "BE" },
  { code: "+501", country: "Belize", iso: "BZ" },
  { code: "+229", country: "Benin", iso: "BJ" },
  { code: "+1441", country: "Bermuda", iso: "BM" },
  { code: "+975", country: "Bhutan", iso: "BT" },
  { code: "+591", country: "Bolivia", iso: "BO" },
  { code: "+387", country: "Bosnia and Herzegovina", iso: "BA" },
  { code: "+267", country: "Botswana", iso: "BW" },
  { code: "+55", country: "Brazil", iso: "BR" },
  { code: "+246", country: "British Indian Ocean Territory", iso: "IO" },
  { code: "+1284", country: "British Virgin Islands", iso: "VG" },
  { code: "+673", country: "Brunei", iso: "BN" },
  { code: "+359", country: "Bulgaria", iso: "BG" },
  { code: "+226", country: "Burkina Faso", iso: "BF" },
  { code: "+257", country: "Burundi", iso: "BI" },
  { code: "+855", country: "Cambodia", iso: "KH" },
  { code: "+237", country: "Cameroon", iso: "CM" },
  { code: "+1", country: "Canada", iso: "CA" },
  { code: "+238", country: "Cape Verde", iso: "CV" },
  { code: "+1345", country: "Cayman Islands", iso: "KY" },
  { code: "+236", country: "Central African Republic", iso: "CF" },
  { code: "+235", country: "Chad", iso: "TD" },
  { code: "+56", country: "Chile", iso: "CL" },
  { code: "+86", country: "China", iso: "CN" },
  { code: "+61", country: "Christmas Island", iso: "CX" },
  { code: "+61", country: "Cocos Islands", iso: "CC" },
  { code: "+57", country: "Colombia", iso: "CO" },
  { code: "+269", country: "Comoros", iso: "KM" },
  { code: "+243", country: "Congo (DRC)", iso: "CD" },
  { code: "+242", country: "Congo (Republic)", iso: "CG" },
  { code: "+682", country: "Cook Islands", iso: "CK" },
  { code: "+506", country: "Costa Rica", iso: "CR" },
  { code: "+385", country: "Croatia", iso: "HR" },
  { code: "+53", country: "Cuba", iso: "CU" },
  { code: "+599", country: "Curacao", iso: "CW" },
  { code: "+357", country: "Cyprus", iso: "CY" },
  { code: "+420", country: "Czech Republic", iso: "CZ" },
  { code: "+45", country: "Denmark", iso: "DK" },
  { code: "+253", country: "Djibouti", iso: "DJ" },
  { code: "+1767", country: "Dominica", iso: "DM" },
  { code: "+1809", country: "Dominican Republic", iso: "DO" },
  { code: "+593", country: "Ecuador", iso: "EC" },
  { code: "+20", country: "Egypt", iso: "EG" },
  { code: "+503", country: "El Salvador", iso: "SV" },
  { code: "+240", country: "Equatorial Guinea", iso: "GQ" },
  { code: "+291", country: "Eritrea", iso: "ER" },
  { code: "+372", country: "Estonia", iso: "EE" },
  { code: "+268", country: "Eswatini", iso: "SZ" },
  { code: "+251", country: "Ethiopia", iso: "ET" },
  { code: "+500", country: "Falkland Islands", iso: "FK" },
  { code: "+298", country: "Faroe Islands", iso: "FO" },
  { code: "+679", country: "Fiji", iso: "FJ" },
  { code: "+358", country: "Finland", iso: "FI" },
  { code: "+33", country: "France", iso: "FR" },
  { code: "+594", country: "French Guiana", iso: "GF" },
  { code: "+689", country: "French Polynesia", iso: "PF" },
  { code: "+241", country: "Gabon", iso: "GA" },
  { code: "+220", country: "Gambia", iso: "GM" },
  { code: "+995", country: "Georgia", iso: "GE" },
  { code: "+49", country: "Germany", iso: "DE" },
  { code: "+233", country: "Ghana", iso: "GH" },
  { code: "+350", country: "Gibraltar", iso: "GI" },
  { code: "+30", country: "Greece", iso: "GR" },
  { code: "+299", country: "Greenland", iso: "GL" },
  { code: "+1473", country: "Grenada", iso: "GD" },
  { code: "+590", country: "Guadeloupe", iso: "GP" },
  { code: "+1671", country: "Guam", iso: "GU" },
  { code: "+502", country: "Guatemala", iso: "GT" },
  { code: "+44", country: "Guernsey", iso: "GG" },
  { code: "+224", country: "Guinea", iso: "GN" },
  { code: "+245", country: "Guinea-Bissau", iso: "GW" },
  { code: "+592", country: "Guyana", iso: "GY" },
  { code: "+509", country: "Haiti", iso: "HT" },
  { code: "+504", country: "Honduras", iso: "HN" },
  { code: "+852", country: "Hong Kong", iso: "HK" },
  { code: "+36", country: "Hungary", iso: "HU" },
  { code: "+354", country: "Iceland", iso: "IS" },
  { code: "+91", country: "India", iso: "IN" },
  { code: "+62", country: "Indonesia", iso: "ID" },
  { code: "+98", country: "Iran", iso: "IR" },
  { code: "+964", country: "Iraq", iso: "IQ" },
  { code: "+353", country: "Ireland", iso: "IE" },
  { code: "+44", country: "Isle of Man", iso: "IM" },
  { code: "+972", country: "Israel", iso: "IL" },
  { code: "+39", country: "Italy", iso: "IT" },
  { code: "+225", country: "Ivory Coast", iso: "CI" },
  { code: "+1876", country: "Jamaica", iso: "JM" },
  { code: "+81", country: "Japan", iso: "JP" },
  { code: "+44", country: "Jersey", iso: "JE" },
  { code: "+962", country: "Jordan", iso: "JO" },
  { code: "+7", country: "Kazakhstan", iso: "KZ" },
  { code: "+254", country: "Kenya", iso: "KE" },
  { code: "+686", country: "Kiribati", iso: "KI" },
  { code: "+383", country: "Kosovo", iso: "XK" },
  { code: "+965", country: "Kuwait", iso: "KW" },
  { code: "+996", country: "Kyrgyzstan", iso: "KG" },
  { code: "+856", country: "Laos", iso: "LA" },
  { code: "+371", country: "Latvia", iso: "LV" },
  { code: "+961", country: "Lebanon", iso: "LB" },
  { code: "+266", country: "Lesotho", iso: "LS" },
  { code: "+231", country: "Liberia", iso: "LR" },
  { code: "+218", country: "Libya", iso: "LY" },
  { code: "+423", country: "Liechtenstein", iso: "LI" },
  { code: "+370", country: "Lithuania", iso: "LT" },
  { code: "+352", country: "Luxembourg", iso: "LU" },
  { code: "+853", country: "Macau", iso: "MO" },
  { code: "+261", country: "Madagascar", iso: "MG" },
  { code: "+265", country: "Malawi", iso: "MW" },
  { code: "+60", country: "Malaysia", iso: "MY" },
  { code: "+960", country: "Maldives", iso: "MV" },
  { code: "+223", country: "Mali", iso: "ML" },
  { code: "+356", country: "Malta", iso: "MT" },
  { code: "+692", country: "Marshall Islands", iso: "MH" },
  { code: "+596", country: "Martinique", iso: "MQ" },
  { code: "+222", country: "Mauritania", iso: "MR" },
  { code: "+230", country: "Mauritius", iso: "MU" },
  { code: "+262", country: "Mayotte", iso: "YT" },
  { code: "+52", country: "Mexico", iso: "MX" },
  { code: "+691", country: "Micronesia", iso: "FM" },
  { code: "+373", country: "Moldova", iso: "MD" },
  { code: "+377", country: "Monaco", iso: "MC" },
  { code: "+976", country: "Mongolia", iso: "MN" },
  { code: "+382", country: "Montenegro", iso: "ME" },
  { code: "+1664", country: "Montserrat", iso: "MS" },
  { code: "+212", country: "Morocco", iso: "MA" },
  { code: "+258", country: "Mozambique", iso: "MZ" },
  { code: "+95", country: "Myanmar", iso: "MM" },
  { code: "+264", country: "Namibia", iso: "NA" },
  { code: "+674", country: "Nauru", iso: "NR" },
  { code: "+977", country: "Nepal", iso: "NP" },
  { code: "+31", country: "Netherlands", iso: "NL" },
  { code: "+687", country: "New Caledonia", iso: "NC" },
  { code: "+64", country: "New Zealand", iso: "NZ" },
  { code: "+505", country: "Nicaragua", iso: "NI" },
  { code: "+227", country: "Niger", iso: "NE" },
  { code: "+234", country: "Nigeria", iso: "NG" },
  { code: "+683", country: "Niue", iso: "NU" },
  { code: "+672", country: "Norfolk Island", iso: "NF" },
  { code: "+850", country: "North Korea", iso: "KP" },
  { code: "+389", country: "North Macedonia", iso: "MK" },
  { code: "+1670", country: "Northern Mariana Islands", iso: "MP" },
  { code: "+47", country: "Norway", iso: "NO" },
  { code: "+968", country: "Oman", iso: "OM" },
  { code: "+92", country: "Pakistan", iso: "PK" },
  { code: "+680", country: "Palau", iso: "PW" },
  { code: "+970", country: "Palestine", iso: "PS" },
  { code: "+507", country: "Panama", iso: "PA" },
  { code: "+675", country: "Papua New Guinea", iso: "PG" },
  { code: "+595", country: "Paraguay", iso: "PY" },
  { code: "+51", country: "Peru", iso: "PE" },
  { code: "+63", country: "Philippines", iso: "PH" },
  { code: "+48", country: "Poland", iso: "PL" },
  { code: "+351", country: "Portugal", iso: "PT" },
  { code: "+1787", country: "Puerto Rico", iso: "PR" },
  { code: "+974", country: "Qatar", iso: "QA" },
  { code: "+262", country: "Réunion", iso: "RE" },
  { code: "+40", country: "Romania", iso: "RO" },
  { code: "+7", country: "Russia", iso: "RU" },
  { code: "+250", country: "Rwanda", iso: "RW" },
  { code: "+590", country: "Saint Barthélemy", iso: "BL" },
  { code: "+290", country: "Saint Helena", iso: "SH" },
  { code: "+1869", country: "Saint Kitts and Nevis", iso: "KN" },
  { code: "+1758", country: "Saint Lucia", iso: "LC" },
  { code: "+590", country: "Saint Martin", iso: "MF" },
  { code: "+508", country: "Saint Pierre and Miquelon", iso: "PM" },
  { code: "+1784", country: "Saint Vincent and the Grenadines", iso: "VC" },
  { code: "+685", country: "Samoa", iso: "WS" },
  { code: "+378", country: "San Marino", iso: "SM" },
  { code: "+239", country: "Sao Tome and Principe", iso: "ST" },
  { code: "+966", country: "Saudi Arabia", iso: "SA" },
  { code: "+221", country: "Senegal", iso: "SN" },
  { code: "+381", country: "Serbia", iso: "RS" },
  { code: "+248", country: "Seychelles", iso: "SC" },
  { code: "+232", country: "Sierra Leone", iso: "SL" },
  { code: "+65", country: "Singapore", iso: "SG" },
  { code: "+1721", country: "Sint Maarten", iso: "SX" },
  { code: "+421", country: "Slovakia", iso: "SK" },
  { code: "+386", country: "Slovenia", iso: "SI" },
  { code: "+677", country: "Solomon Islands", iso: "SB" },
  { code: "+252", country: "Somalia", iso: "SO" },
  { code: "+27", country: "South Africa", iso: "ZA" },
  { code: "+82", country: "South Korea", iso: "KR" },
  { code: "+211", country: "South Sudan", iso: "SS" },
  { code: "+34", country: "Spain", iso: "ES" },
  { code: "+94", country: "Sri Lanka", iso: "LK" },
  { code: "+249", country: "Sudan", iso: "SD" },
  { code: "+597", country: "Suriname", iso: "SR" },
  { code: "+47", country: "Svalbard and Jan Mayen", iso: "SJ" },
  { code: "+46", country: "Sweden", iso: "SE" },
  { code: "+41", country: "Switzerland", iso: "CH" },
  { code: "+963", country: "Syria", iso: "SY" },
  { code: "+886", country: "Taiwan", iso: "TW" },
  { code: "+992", country: "Tajikistan", iso: "TJ" },
  { code: "+255", country: "Tanzania", iso: "TZ" },
  { code: "+66", country: "Thailand", iso: "TH" },
  { code: "+670", country: "Timor-Leste", iso: "TL" },
  { code: "+228", country: "Togo", iso: "TG" },
  { code: "+690", country: "Tokelau", iso: "TK" },
  { code: "+676", country: "Tonga", iso: "TO" },
  { code: "+1868", country: "Trinidad and Tobago", iso: "TT" },
  { code: "+216", country: "Tunisia", iso: "TN" },
  { code: "+90", country: "Turkey", iso: "TR" },
  { code: "+993", country: "Turkmenistan", iso: "TM" },
  { code: "+1649", country: "Turks and Caicos Islands", iso: "TC" },
  { code: "+688", country: "Tuvalu", iso: "TV" },
  { code: "+256", country: "Uganda", iso: "UG" },
  { code: "+380", country: "Ukraine", iso: "UA" },
  { code: "+971", country: "United Arab Emirates", iso: "AE" },
  { code: "+44", country: "United Kingdom", iso: "GB" },
  { code: "+1", country: "United States", iso: "US" },
  { code: "+598", country: "Uruguay", iso: "UY" },
  { code: "+1340", country: "US Virgin Islands", iso: "VI" },
  { code: "+998", country: "Uzbekistan", iso: "UZ" },
  { code: "+678", country: "Vanuatu", iso: "VU" },
  { code: "+39", country: "Vatican City", iso: "VA" },
  { code: "+58", country: "Venezuela", iso: "VE" },
  { code: "+84", country: "Vietnam", iso: "VN" },
  { code: "+681", country: "Wallis and Futuna", iso: "WF" },
  { code: "+212", country: "Western Sahara", iso: "EH" },
  { code: "+967", country: "Yemen", iso: "YE" },
  { code: "+260", country: "Zambia", iso: "ZM" },
  { code: "+263", country: "Zimbabwe", iso: "ZW" },
].sort((a, b) => a.country.localeCompare(b.country));

interface Props {
  selectedCode: string;
  onSelect: (code: string) => void;
}

// Each row is 44px tall. 6 visible rows = 264px, 8 visible rows = 352px.
const ROW_HEIGHT = 44;
const MIN_VISIBLE = 6;
const MAX_VISIBLE = 8;

export default function CountryCodeDropdown({ selectedCode, onSelect }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = countryCodes.filter(c =>
    c.country.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search)
  );

  // Height = clamp between MIN_VISIBLE and MAX_VISIBLE rows
  const visibleRows = Math.min(MAX_VISIBLE, Math.max(MIN_VISIBLE, filtered.length));
  const listHeight = visibleRows * ROW_HEIGHT;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const currentCountry = countryCodes.find(c => c.code === selectedCode && c.iso) ?? countryCodes.find(c => c.code === selectedCode) ?? countryCodes[0];

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 h-full min-h-[56px] bg-white border border-slate-200 rounded-full hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all focus:outline-none whitespace-nowrap"
      >
          <span className="text-xl leading-none">{getFlagEmoji(currentCountry.iso)}</span>
        <span className="text-base font-bold text-slate-800">{currentCountry.code}</span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-[200] mt-2 left-0 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
          >
            {/* Search */}
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search country or code…"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:outline-none transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* List — fixed height shows MIN_VISIBLE rows, scrolls beyond */}
            <div
              className="overflow-y-auto custom-scrollbar"
              style={{ height: `${listHeight}px` }}
            >
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2 py-8">
                  <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  No countries found
                </div>
              ) : (
                filtered.map((c) => {
                  const isSelected = selectedCode === c.code && currentCountry.iso === c.iso;
                  return (
                    <button
                      key={c.iso}
                      type="button"
                      style={{ height: `${ROW_HEIGHT}px` }}
                      onClick={() => {
                        onSelect(c.code);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 transition-colors text-left ${
                        isSelected
                          ? "bg-blue-50 text-blue-700"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl leading-none flex-shrink-0">{getFlagEmoji(c.iso)}</span>
                        <span className="text-sm font-medium truncate">{c.country}</span>
                      </span>
                      <span className={`text-sm font-bold flex-shrink-0 ${isSelected ? "text-blue-600" : "text-blue-500"}`}>
                        {c.code}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer count */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/60">
              <p className="text-[10px] text-slate-400 font-medium">
                {filtered.length} {filtered.length === 1 ? "country" : "countries"} · Scroll for more
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
