import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function FormulaNotes() {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("formulas.title")}</CardTitle>
        <CardDescription>{t("formulas.desc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 text-sm leading-relaxed text-muted">
        <Formula title={t("formulas.tflopsTitle")} body={t("formulas.tflopsBody")} />
        <Formula title={t("formulas.vramTitle")} body={t("formulas.vramBody")} />
        <Formula title={t("formulas.speedTitle")} body={t("formulas.speedBody")} />
        <Formula title={t("formulas.roofTitle")} body={t("formulas.roofBody")} />
      </CardContent>
    </Card>
  );
}

function Formula({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-medium text-fg">{title}</p>
      <p className="mt-1">{body}</p>
    </div>
  );
}
