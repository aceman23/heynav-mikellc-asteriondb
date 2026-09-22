// Sample data for Steve's three NAICS entry points + an in-memory user profile
// (HEYNAV_SAMPLE_DATA=1). Shapes match cloud-test exactly:
//   getNaicsSectors           → [{ sectorCode, sector, description }]
//   getNaicsBySector          → { naicsBySector: [{ naicsCodeId, naicsCode, title }] }
//   getNaicsCodeDescriptions  → { naicsCode, title, descriptions: [{ descriptionId, description }] }
// Identity is naicsCodeId (Steve's internal id), never the code string.
// This is a small subset; titles follow NAICS 2022, ids are invented.

export type NaicsSectorT = { sectorCode: string; sector: string; description: string };
export type NaicsCodeT = { naicsCodeId: number; naicsCode: string; title: string };
export type NaicsDescriptionT = { descriptionId: number; description: string };
export type NaicsCodeDetailT = { naicsCode: string; title: string; descriptions: NaicsDescriptionT[] };

export type ProfileNaicsT = { naicsCodeId: number; naicsCode: string; title: string; sectorCode: string };
export type UserProfileT = { naicsCodes: ProfileNaicsT[]; updatedAt: string | null };

export const SAMPLE_SECTORS: NaicsSectorT[] = [
  { sectorCode: "11", sector: "Agriculture, Forestry, Fishing and Hunting", description: "Growing crops, raising animals, harvesting timber, and harvesting fish and other animals from farms, ranches, or their natural habitats." },
  { sectorCode: "21", sector: "Mining, Quarrying, and Oil and Gas Extraction", description: "Extracting naturally occurring mineral solids, liquid minerals, and gases." },
  { sectorCode: "22", sector: "Utilities", description: "Providing electric power, natural gas, steam supply, water supply, and sewage removal." },
  { sectorCode: "23", sector: "Construction", description: "Constructing buildings and engineering projects, and specialty trade contractors." },
  { sectorCode: "31", sector: "Manufacturing", description: "Mechanical, physical, or chemical transformation of materials, substances, or components into new products." },
  { sectorCode: "42", sector: "Wholesale Trade", description: "Wholesaling merchandise, generally without transformation, and rendering services incidental to the sale." },
  { sectorCode: "44", sector: "Retail Trade", description: "Retailing merchandise, generally without transformation, and rendering services incidental to the sale." },
  { sectorCode: "48", sector: "Transportation and Warehousing", description: "Transportation of passengers and cargo, warehousing and storage, scenic and sightseeing transportation, and support activities." },
  { sectorCode: "51", sector: "Information", description: "Producing and distributing information and cultural products, providing the means to transmit or distribute them, and processing data." },
  { sectorCode: "52", sector: "Finance and Insurance", description: "Financial transactions and facilitating financial transactions." },
  { sectorCode: "53", sector: "Real Estate and Rental and Leasing", description: "Renting, leasing, or otherwise allowing the use of tangible or intangible assets." },
  { sectorCode: "54", sector: "Professional, Scientific, and Technical Services", description: "Specialized professional, scientific, and technical activities requiring a high degree of expertise and training." },
  { sectorCode: "55", sector: "Management of Companies and Enterprises", description: "Holding the securities of companies and enterprises, or administering, overseeing, and managing establishments." },
  { sectorCode: "56", sector: "Administrative and Support and Waste Management and Remediation Services", description: "Routine support activities for the day-to-day operations of other organizations." },
  { sectorCode: "61", sector: "Educational Services", description: "Providing instruction and training in a wide variety of subjects." },
  { sectorCode: "62", sector: "Health Care and Social Assistance", description: "Providing health care and social assistance for individuals." },
  { sectorCode: "71", sector: "Arts, Entertainment, and Recreation", description: "Operating facilities or providing services to meet varied cultural, entertainment, and recreational interests." },
  { sectorCode: "72", sector: "Accommodation and Food Services", description: "Providing customers with lodging and/or preparing meals, snacks, and beverages for immediate consumption." },
  { sectorCode: "81", sector: "Other Services (except Public Administration)", description: "Services not specifically provided for elsewhere in the classification system." },
  { sectorCode: "92", sector: "Public Administration", description: "Federal, state, and local government agencies that administer, oversee, and manage public programs." },
];

let nextId = 600;
const BY_SECTOR: Record<string, NaicsCodeT[]> = {};
const DESCRIPTIONS: Record<number, NaicsDescriptionT[]> = {};
let nextDesc = 16000;
function add(sector: string, naicsCode: string, title: string, descriptions: string[] = []) {
  const row = { naicsCodeId: nextId++, naicsCode, title };
  (BY_SECTOR[sector] ??= []).push(row);
  DESCRIPTIONS[row.naicsCodeId] = descriptions.map((d) => ({ descriptionId: nextDesc++, description: d }));
}

add("54", "541310", "Architectural Services", ["Architectural design services", "Architectural services (except landscape)"]);
add("54", "541330", "Engineering Services", ["Civil engineering services", "Electrical engineering services", "Engineering consulting services", "Mechanical engineering services"]);
add("54", "541511", "Custom Computer Programming Services", ["Applications software programming services, custom computer", "Computer program or software development, custom", "Software analysis and design services, custom computer", "Web (i.e., Internet) page design services, custom"]);
add("54", "541512", "Computer Systems Design Services", ["CAD/CAM systems integration design services", "Computer systems integration analysis and design services", "Information management computer systems integration design services", "Local area network (LAN) computer systems integration design services"]);
add("54", "541513", "Computer Facilities Management Services", ["Computer systems facilities management and operation services", "Data processing facilities management services"]);
add("54", "541519", "Other Computer Related Services", ["Computer disaster recovery services", "Software installation services, computer"]);
add("54", "541611", "Administrative Management and General Management Consulting Services", ["Administrative management consulting services", "General management consulting services", "Strategic planning consulting services"]);
add("54", "541612", "Human Resources Consulting Services", ["Compensation planning services", "Human resource consulting services"]);
add("54", "541613", "Marketing Consulting Services", ["Marketing consulting services", "Sales management consulting services"]);
add("54", "541614", "Process, Physical Distribution, and Logistics Consulting Services", ["Logistics management consulting services", "Manufacturing operations improvement consulting services"]);
add("54", "541618", "Other Management Consulting Services", ["Site location consulting services", "Telecommunications management consulting services"]);
add("54", "541690", "Other Scientific and Technical Consulting Services", ["Economic consulting services", "Safety consulting services", "Security consulting services"]);
add("54", "541713", "Research and Development in Nanotechnology", ["Nanobiotechnologies research and experimental development laboratories"]);
add("54", "541714", "Research and Development in Biotechnology (except Nanobiotechnology)", ["Biotechnology research and development laboratories or services (except nanobiotechnology research and development)"]);
add("54", "541715", "Research and Development in the Physical, Engineering, and Life Sciences (except Nanotechnology and Biotechnology)", ["Computer research and development laboratories", "Engineering research and development laboratories", "Guided missile and space vehicle engine research and development"]);
add("54", "541990", "All Other Professional, Scientific, and Technical Services", ["Appraisal (except real estate) services", "Handwriting analysis services"]);
add("56", "561210", "Facilities Support Services", ["Base facilities operation support services", "Facilities (except computer operation) support services"]);
add("56", "561320", "Temporary Help Services", ["Help supply services", "Temporary help services"]);
add("56", "561612", "Security Guards and Patrol Services", ["Bodyguard services", "Guard services", "Security guard services"]);
add("56", "561621", "Security Systems Services (except Locksmiths)", ["Security system monitoring services", "Security systems services (except locksmiths)"]);
add("51", "512110", "Motion Picture and Video Production", ["Animated cartoon production", "Animated cartoon production and distribution", "Motion picture production", "Television show production"]);
add("51", "517111", "Wired Telecommunications Carriers", ["Broadband Internet service providers, wired", "Telephone communication carriers, wired"]);
add("51", "518210", "Computing Infrastructure Providers, Data Processing, Web Hosting, and Related Services", ["Cloud storage services", "Data processing services", "Web hosting services"]);
add("23", "236220", "Commercial and Institutional Building Construction", ["Airport building construction", "Barracks construction", "Office building construction"]);
add("23", "237310", "Highway, Street, and Bridge Construction", ["Bridge construction", "Highway construction", "Runway construction"]);
add("23", "238210", "Electrical Contractors and Other Wiring Installation Contractors", ["Computer and network cable installation", "Electrical contractors", "Fiber optic cable (except transmission lines) contractors"]);
add("31", "334511", "Search, Detection, Navigation, Guidance, Aeronautical, and Nautical System and Instrument Manufacturing", ["Aircraft flight instruments manufacturing", "Radar systems and equipment manufacturing", "Sonar systems and equipment manufacturing"]);
add("31", "336411", "Aircraft Manufacturing", ["Aircraft manufacturing", "Helicopters manufacturing", "Unmanned aircraft manufacturing"]);
add("48", "484121", "General Freight Trucking, Long-Distance, Truckload", ["General freight trucking, long-distance, truckload (TL)"]);
add("48", "488190", "Other Support Activities for Air Transportation", ["Aircraft maintenance and repair services (except factory conversions)", "Airport baggage handling services"]);
add("48", "493110", "General Warehousing and Storage", ["Bonded warehousing", "General warehousing and storage"]);
add("61", "611430", "Professional and Management Development Training", ["Management development training", "Professional development training"]);
add("61", "611710", "Educational Support Services", ["Educational consultants", "Educational testing services"]);
add("62", "621111", "Offices of Physicians (except Mental Health Specialists)", ["Physicians' offices (except mental health specialists)"]);

export function sampleSectors(): NaicsSectorT[] { return SAMPLE_SECTORS; }
export function sampleBySector(sectorCode: string): NaicsCodeT[] { return BY_SECTOR[sectorCode] ?? []; }
export function sampleDescriptions(naicsCodeId: number): NaicsCodeDetailT | null {
  for (const list of Object.values(BY_SECTOR)) {
    const c = list.find((x) => x.naicsCodeId === naicsCodeId);
    if (c) return { naicsCode: c.naicsCode, title: c.title, descriptions: DESCRIPTIONS[naicsCodeId] ?? [] };
  }
  return null;
}

const profile: UserProfileT = { naicsCodes: [], updatedAt: null };
export function sampleGetProfile(): UserProfileT { return profile; }
export function sampleSaveProfile(codes: ProfileNaicsT[]): UserProfileT {
  profile.naicsCodes = codes;
  profile.updatedAt = new Date().toISOString();
  return profile;
}
