import type { NusmodsModule } from "@lib/nusmods";

export type SelectedModule = {
  moduleCode: string;
  title: string;
  faculty: string | null;
  department: string | null;
};

export function toSelectedModule(module: NusmodsModule): SelectedModule {
  return {
    moduleCode: module.moduleCode,
    title: module.title,
    faculty: module.faculty ?? null,
    department: module.department ?? null,
  };
}
