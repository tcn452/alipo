'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'ny';

const CHICHEWA: Record<string, string> = {
  'Fuel is there': 'Mafuta alipo',
  'Live map': 'Mapu a pompopompo',
  'Fleet portal': 'Tsamba la magalimoto',
  'Report': 'Tiuzeni',
  'Report fuel': 'Tiuzeni za mafuta',
  "Malawi's live fuel network. Keep Malawi moving.": 'Netiweki ya mafuta ya Malawi ya pompopompo. Tipitirize kuyendetsa Malawi.',
  "Fuel is there. You're not alone.": 'Mafuta alipo. Simuli nokha.',
  'Find fuel, see queue times and share what you know. Built for every drive moving in Malawi.': 'Pezani mafuta, onani nthawi ya pamzere, ndipo gawani zomwe mukudziwa. Yapangidwa pa ulendo uliwonse ku Malawi.',
  'Fuel available': 'Mafuta alipo', 'Available': 'Alipo', 'Running low': 'Atsala pang’ono', 'Low supply': 'Mafuta atsala pang’ono', 'No fuel': 'Mafuta palibe', 'Stale': 'Lakale', 'Stale report': 'Lipoti lakale', 'Awaiting report': 'Tikuyembekezera lipoti',
  'Search station or area': 'Sakani malo kapena dera', 'Search station, area or brand': 'Sakani malo, dera kapena kampani',
  'Finding you…': 'Tikukupezani…', 'Near me': 'Pafupi ndi ine', 'Use my location': 'Gwiritsani malo anga', 'All Malawi': 'Malawi yonse',
  'Your location is outside Malawi, so the national map is shown.': 'Muli kunja kwa Malawi, choncho tikuwonetsa mapu a dziko lonse.',
  'Location unavailable. Allow location access in your browser and try again.': 'Malo anu sakupezeka. Lolani msakatuli kugwiritsa ntchito malo anu ndipo yesaninso.',
  'You may be at this station': 'Mwina muli pa siteshoni iyi', 'away': 'kuchokera pano', 'Quick report': 'Lipoti lachangu', 'Dismiss station suggestion': 'Tsekani lingaliro la siteshoni',
  'Station alerts': 'Zidziwitso za siteshoni', 'Alerts on': 'Zidziwitso zatsegulidwa', 'Are you at {station}?': 'Kodi muli pa {station}?',
  'When safely parked, help other drivers with a quick fuel report.': 'Mukayimitsa bwino galimoto, thandizani oyendetsa ena ndi lipoti lachangu la mafuta.',
  'Notifications are blocked. Enable them in your browser settings to use station alerts.': 'Zidziwitso zatsekedwa. Zitseguleni mu zoikamo za msakatuli kuti mugwiritse ntchito zidziwitso za siteshoni.',
  'How Alipo works': 'Mmene Alipo imagwirira ntchito', 'Close how Alipo works': 'Tsekani mmene Alipo imagwirira ntchito', 'Step {number}': 'Gawo {number}',
  'Find stations near you': 'Pezani malo ogulitsa mafuta pafupi nanu', 'Use your location, choose a city, or change the radius.': 'Gwiritsani malo anu, sankhani mzinda, kapena sinthani utali wosakira.',
  'Check before you drive': 'Yang’anani musanayende', 'See petrol and diesel availability, queues, and when reports become stale.': 'Onani kupezeka kwa petulo ndi dizilo, mizere, komanso nthawi imene malipoti amakhala akale.',
  'Share what you see': 'Gawani zomwe mukuona', 'Submit a quick report, correct a station name, or flag a station that no longer exists.': 'Tumizani lipoti lachangu, konzani dzina la siteshoni, kapena tiuzeni za siteshoni yomwe kulibenso.',
  'Community reports expire after four hours so drivers can trust that updates are recent.': 'Malipoti a anthu amatha pakadutsa maola anayi kuti oyendetsa akhulupirire kuti nkhani zake ndi zaposachedwa.', 'Start finding fuel': 'Yambani kupeza mafuta',
  "Powered by Malawi's community": 'Imayendetsedwa ndi anthu a ku Malawi', 'Alipo uses crowdsourced information shared by drivers and communities across Malawi. Thank you for helping us build and improve it.': 'Alipo imadalira uthenga wochokera kwa oyendetsa ndi anthu m’madera osiyanasiyana a Malawi. Zikomo kwambiri potithandiza kupanga ndi kukonza pulogalamuyi.',
  'All reports': 'Malipoti onse', 'All': 'Onse', 'All fuel': 'Mafuta onse', 'Fuel type filter': 'Sankhani mtundu wa mafuta', 'Fuel availability': 'Kupezeka kwa mafuta', 'Radius': 'Utali', 'Search radius': 'Utali wosakira', 'Show station list': 'Onetsani mndandanda wa malo', 'Show map': 'Onetsani mapu',
  'Malawi coverage': 'Madera a Malawi', 'Near your location': 'Pafupi ndi malo anu', '{city} coverage': 'Madera a {city}', '{count} fuel stations': 'Malo {count} ogulitsa mafuta', '{count} fuel stations within {radius} km': 'Malo {count} ogulitsa mafuta mkati mwa makilomita {radius}',
  'Refresh': 'Tsitsimutsani', 'Live Alipo station data. OpenStreetMap is used only where Alipo coverage is unavailable.': 'Deta ya malo a Alipo ya pompopompo. OpenStreetMap imagwiritsidwa ntchito kokha kumene deta ya Alipo kulibe.',
  'Loading fuel stations': 'Tikukweza malo ogulitsa mafuta', 'Loading fuel stations…': 'Tikukweza malo ogulitsa mafuta…', 'Checking live Alipo coverage…': 'Tikuyang’ana dera la Alipo la pompopompo…', 'No matching stations': 'Palibe malo ofanana', 'Try another area or fuel status.': 'Yesani dera lina kapena mmene mafuta alili.',
  'Fuel types': 'Mitundu ya mafuta', 'Queue': 'Mzere', 'Unknown': 'Sizikudziwika', 'Updated': 'Lasinthidwa', 'History': 'Mbiri', 'Update': 'Sinthani',
  'Recent community reports': 'Malipoti aposachedwa a anthu', 'Loading history…': 'Tikukweza mbiri…', 'Report history could not be loaded.': 'Mbiri ya malipoti sinathe kukwezedwa.', 'No community reports yet.': 'Palibe malipoti a anthu pano.',
  'Report an update': 'Tumizani kusintha', 'No data? No problem.': 'Deta palibe? Palibe vuto.', 'Alipo works for every phone.': 'Alipo imagwira ntchito pa foni iliyonse.', 'Alipo works wherever you drive.': 'Alipo imagwira ntchito kulikonse kumene mukuyendetsa.', 'Dial from any network': 'Imbani kuchokera pa netiweki iliyonse', 'Community reports': 'Malipoti a anthu', 'Built around Malawi': 'Yapangidwa kaamba ka Malawi',
  'Find fuel. Share updates. Keep Malawi moving.': 'Pezani mafuta. Gawani zosintha. Tipitirize kuyendetsa Malawi.', 'Created by': 'Yopangidwa ndi',
  'Community update': 'Nkhani ya anthu', "What's the fuel situation?": 'Mafuta ali bwanji?', 'One quick report can save someone a long trip.': 'Lipoti limodzi lachangu lingapulumutse munthu ulendo wautali.', 'Close report form': 'Tsekani fomu ya lipoti',
  'Your report helps keep Malawi moving.': 'Lipoti lanu likuthandiza Malawi kuyenda.', 'Fuel station': 'Malo ogulitsa mafuta', 'Report type': 'Mtundu wa lipoti', 'Fuel update': 'Nkhani ya mafuta', 'Availability and queue': 'Kupezeka ndi mzere', 'Station does not exist': 'Malo awa kulibe', 'Flag an incorrect location': 'Tiuzeni malo olakwika',
  'Correct station name': 'Konzani dzina la siteshoni', 'Suggest the right name': 'Perekani dzina lolondola', 'Suggested station name': 'Dzina la siteshoni lomwe mukupereka', 'Enter the correct station name': 'Lembani dzina lolondola la siteshoni',
  'Two matching suggestions from different phone numbers will confirm and update the station name.': 'Malingaliro awiri ofanana ochokera ku manambala osiyanasiyana adzatsimikizira ndi kusintha dzina la siteshoni.',
  'Suggestion saved. One more matching vote will confirm this name.': 'Lingaliro lasungidwa. Voti ina yofanana idzatsimikizira dzinali.', 'The station name is now confirmed and updated.': 'Dzina la siteshoni latsimikizidwa ndipo lasinthidwa.',
  'Vote on suggested names': 'Voterani mayina operekedwa', 'Suggested station names': 'Mayina a masiteshoni operekedwa', 'Help confirm station names shared by the community.': 'Thandizani kutsimikizira mayina a masiteshoni operekedwa ndi anthu.', 'Close suggested names': 'Tsekani mayina operekedwa',
  'Your phone number': 'Nambala yanu ya foni', 'used only to prevent duplicate votes': 'imagwiritsidwa ntchito popewa mavoti obwerezabwereza', 'Enter a valid phone number to vote.': 'Lembani nambala ya foni yovomerezeka kuti muvote.', 'Unable to load suggested names.': 'Sitinathe kukweza mayina operekedwa.', 'Unable to save your vote.': 'Sitinathe kusunga voti yanu.', 'Supabase server credentials are not configured.': 'Kulumikizana ndi Supabase sikunakonzedwe pa seva.',
  'Loading suggested names…': 'Tikukweza mayina operekedwa…', '{count} of 2 votes': 'Mavoti {count} mwa 2', 'Vote': 'Voterani', 'Vote saved. One more matching vote will confirm this name.': 'Voti yasungidwa. Voti ina yofanana idzatsimikizira dzinali.', 'Name confirmed. Thank you for voting.': 'Dzina latsimikizidwa. Zikomo povota.', 'No names awaiting votes': 'Palibe mayina odikira mavoti', 'The community has reviewed every suggestion for now.': 'Pakali pano anthu awunika mayina onse operekedwa.',
  'Fuel situation': 'Mmene mafuta alili', 'Station is serving': 'Malo akugulitsa', 'Supply may finish soon': 'Mafuta akhoza kutha posachedwa', 'Pumps are dry': 'Mapampu alibe mafuta', 'Fuel type': 'Mtundu wa mafuta', 'Both': 'Onse', 'Petrol': 'Petulo', 'Diesel': 'Dizilo',
  'Queue length': 'Kutalika kwa mzere', 'None': 'Palibe', 'Short': 'Waufupi', 'Medium': 'Wapakati', 'Long': 'Wautali',
  'Five reports from different phone numbers will remove this station from public results. Reports are retained for review.': 'Malipoti asanu ochokera ku manambala osiyanasiyana adzachotsa malowa pa mndandanda wa anthu. Malipoti amasungidwa kuti awunikidwe.',
  'Phone': 'Foni', 'required to prevent duplicate reports': 'ikufunika kupewa malipoti obwerezabwereza', 'optional': 'sikofunikira', 'Submitting report...': 'Tikatumiza lipoti…', 'Submit report': 'Tumizani lipoti', 'Reports are timestamped and cross-checked by the community.': 'Malipoti amasungidwa ndi nthawi ndipo amatsimikiziridwa ndi anthu.', 'Please select a station.': 'Chonde sankhani malo ogulitsa mafuta.', 'Please select a valid station.': 'Chonde sankhani malo ovomerezeka.', 'Unable to submit this report.': 'Sitinathe kutumiza lipotili.',
  'Install Alipo': 'Ikani Alipo', 'Dismiss install prompt': 'Tsekani uthenga woika pulogalamu', 'Fuel updates, one tap away.': 'Nkhani za mafuta, ndi kukhudza kamodzi.', 'Add Alipo to your phone while we build the Android and iPhone apps.': 'Ikani Alipo pa foni yanu pamene tikupanga mapulogalamu a Android ndi iPhone.', 'Install app': 'Ikani pulogalamu', 'Tap Share, then “Add to Home Screen”.': 'Dinani Gawani, kenako “Add to Home Screen”.',
  'Your location': 'Malo anu', 'Map temporarily unavailable': 'Mapu sakupezeka pakadali pano', 'Please check your connection and refresh to load the Malawi map.': 'Onani intaneti yanu ndipo tsitsimutsani kuti mukweze mapu a Malawi.', 'Loading Malawi map': 'Tikukweza mapu a Malawi', 'Loading the live fuel map': 'Tikukweza mapu a mafuta a pompopompo',
  'No recent update': 'Palibe kusintha kwaposachedwa', 'Recently': 'Posachedwa', 'Just now': 'Pakali pano',
};

type Values = Record<string, string | number>;
type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (text: string, values?: Values) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>('en');
  useEffect(() => {
    const saved = window.localStorage.getItem('alipo-language');
    if (saved === 'ny') updateLanguage('ny');
  }, []);
  const setLanguage = useCallback((next: Language) => {
    updateLanguage(next);
    window.localStorage.setItem('alipo-language', next);
    document.documentElement.lang = next;
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const t = useCallback((text: string, values?: Values) => {
    let output = language === 'ny' ? CHICHEWA[text] || text : text;
    for (const [key, value] of Object.entries(values || {})) output = output.replaceAll(`{${key}}`, String(value));
    return output;
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
