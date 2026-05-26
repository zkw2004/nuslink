export type NusmodsModule = {
  moduleCode: string;
  title: string;
  semesters: number[];
  faculty?: string;
  department?: string;
};

type CurrentSemester = {
  academicYear: string;
  semester: string;
};

let cachedAcademicYear: string | null = null;
let moduleCache: NusmodsModule[] | null = null;

export function getCurrentSemester(date = new Date()): CurrentSemester {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const academicYearStart = month >= 8 ? year : year - 1;
  const academicYearEnd = academicYearStart + 1;
  const semesterNumber = month >= 8 && month <= 12 ? 1 : 2;
  const shortStart = String(academicYearStart).slice(-2);
  const shortEnd = String(academicYearEnd).slice(-2);

  return {
    academicYear: `${academicYearStart}-${academicYearEnd}`,
    semester: `AY${shortStart}${shortEnd}S${semesterNumber}`,
  };
}

async function loadModules(academicYear: string) {
  if (moduleCache && cachedAcademicYear === academicYear) {
    return moduleCache;
  }

  const response = await fetch(`https://api.nusmods.com/v2/${academicYear}/moduleList.json`);

  if (!response.ok) {
    throw new Error("Unable to load modules from NUSMods.");
  }

  const modules = (await response.json()) as NusmodsModule[];
  cachedAcademicYear = academicYear;
  moduleCache = modules;

  return modules;
}

export async function searchNusmodsModules(query: string, limit = 8) {
  const trimmedQuery = query.trim().toUpperCase();

  if (trimmedQuery.length < 2) {
    return [];
  }

  const { academicYear } = getCurrentSemester();
  const modules = await loadModules(academicYear);

  return modules
    .filter((module) => {
      const code = module.moduleCode.toUpperCase();
      const title = module.title.toUpperCase();

      return code.includes(trimmedQuery) || title.includes(trimmedQuery);
    })
    .slice(0, limit);
}
