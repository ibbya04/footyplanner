const ZONE_BY_COUNTRY: Record<string, string> = {
    england: 'Europe/London',
    scotland: 'Europe/London',
    wales: 'Europe/London',
    'northern ireland': 'Europe/London',
    'united kingdom': 'Europe/London',
    uk: 'Europe/London',
    ireland: 'Europe/Dublin',
    'republic of ireland': 'Europe/Dublin',
    portugal: 'Europe/Lisbon',
    iceland: 'Atlantic/Reykjavik',
    'faroe islands': 'Atlantic/Faroe',
    turkey: 'Europe/Istanbul',
    türkiye: 'Europe/Istanbul',
    turkiye: 'Europe/Istanbul',
    greece: 'Europe/Athens',
    cyprus: 'Asia/Nicosia',
    romania: 'Europe/Bucharest',
    bulgaria: 'Europe/Sofia',
    ukraine: 'Europe/Kyiv',
    moldova: 'Europe/Chisinau',
    finland: 'Europe/Helsinki',
    estonia: 'Europe/Tallinn',
    latvia: 'Europe/Riga',
    lithuania: 'Europe/Vilnius',
    israel: 'Asia/Jerusalem',
    russia: 'Europe/Moscow',
    belarus: 'Europe/Minsk',
    georgia: 'Asia/Tbilisi',
    armenia: 'Asia/Yerevan',
    azerbaijan: 'Asia/Baku',
    kazakhstan: 'Asia/Almaty',
};

const CENTRAL_EUROPE = 'Europe/Paris';

export function venueZone(country: string | null, lng: number | null): string {
    const key = (country ?? '').trim().toLowerCase();
    if (key === 'spain' && lng != null && lng < -12) return 'Atlantic/Canary';
    if (key === 'portugal' && lng != null && lng < -20) return 'Atlantic/Azores';
    return ZONE_BY_COUNTRY[key] ?? CENTRAL_EUROPE;
}

const formats = new Map<string, Intl.DateTimeFormat>();

function format(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const key = `${locale}|${JSON.stringify(options)}`;
    let cached = formats.get(key);
    if (!cached) {
        cached = new Intl.DateTimeFormat(locale, options);
        formats.set(key, cached);
    }
    return cached;
}

export function dayIn(zone: string, iso: string): string {
    return format('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

export function dateLabel(day: string): string {
    return format('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
        .format(new Date(`${day}T00:00:00Z`))
        .replace(',', '');
}

export function timeIn(zone: string, iso: string): string {
    return format('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function zoneName(zone: string, iso: string): string {
    const parts = format('en-GB', { timeZone: zone, timeZoneName: 'short' }).formatToParts(new Date(iso));
    return parts.find(p => p.type === 'timeZoneName')?.value ?? zone;
}
