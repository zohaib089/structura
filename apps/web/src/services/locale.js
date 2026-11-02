export const WEB_LOCALES = [
    { tag: 'en', nativeName: 'English', direction: 'ltr' },
    { tag: 'pt', nativeName: 'Português', direction: 'ltr' },
    { tag: 'it', nativeName: 'Italiano', direction: 'ltr' },
    { tag: 'fr', nativeName: 'Français', direction: 'ltr' },
    { tag: 'nl', nativeName: 'Nederlands', direction: 'ltr' },
    { tag: 'es', nativeName: 'Español', direction: 'ltr' },
    { tag: 'ja', nativeName: '日本語', direction: 'ltr' },
    { tag: 'zh-Hans', nativeName: '简体中文', direction: 'ltr' },
    { tag: 'hi', nativeName: 'हिन्दी', direction: 'ltr' },
    { tag: 'ur', nativeName: 'اردو', direction: 'rtl' }
];
export { LOCALE_PREFERENCE_KEY, readLocalePreference } from './locale-preference';
const localeTags = new Set(WEB_LOCALES.map(locale => locale.tag));
function isWebLocale(value) {
    return localeTags.has(value);
}
export function isSupportedWebLocale(value) {
    return isWebLocale(value);
}
export function localizedPath(locale, path) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const [firstSegment, ...remainingSegments] = normalizedPath.slice(1).split('/');
    const pathSegments = isWebLocale(firstSegment)
        ? remainingSegments
        : [firstSegment, ...remainingSegments];
    const pathWithoutLocale = pathSegments.join('/');
    return pathWithoutLocale ? `/${locale}/${pathWithoutLocale}` : `/${locale}`;
}
export function matchWebLocale(requestedTag) {
    let canonicalTag;
    try {
        const canonical = Intl.getCanonicalLocales(requestedTag)[0];
        if (!canonical)
            return null;
        canonicalTag = canonical;
    }
    catch {
        return null;
    }
    const candidates = [
        canonicalTag,
        canonicalTag === 'zh-CN' || canonicalTag === 'zh-SG' ? 'zh-Hans' : '',
        canonicalTag.split('-')[0]
    ];
    return candidates.find(isWebLocale) ?? null;
}
export function resolvePreferredWebLocale(storedLocale, languagePreferences) {
    if (storedLocale && isWebLocale(storedLocale))
        return storedLocale;
    for (const language of languagePreferences) {
        const locale = matchWebLocale(language);
        if (locale)
            return locale;
    }
    return 'en';
}
export function webLocaleDirection(locale) {
    const item = WEB_LOCALES.find(localeDefinition => localeDefinition.tag === locale);
    if (!item)
        throw new Error(`Unsupported web locale: ${locale}`);
    return item.direction;
}
