import { requirePageRole } from "@/src/lib/guards";
import { getT } from "@/src/i18n/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requirePageRole("MEMBER", "STAFF", "ADMIN");
  const t = await getT();

  return (
    <main className="page">
      <div className="pageHead">
        <h1>{t("profile.title")}</h1>
        <p>{t("profile.text")}</p>
      </div>

      <div className="infoCard" style={{ maxWidth: "28rem" }}>
        <ul className="rows">
          <li>
            <span className="muted">{t("profile.name")}</span>
            <span>{user.name}</span>
          </li>
          <li>
            <span className="muted">{t("profile.email")}</span>
            <span>{user.email}</span>
          </li>
          <li>
            <span className="muted">{t("profile.role")}</span>
            <span className={`badge badge${user.role}`}>{t.messages.roles[user.role]}</span>
          </li>
        </ul>
      </div>
    </main>
  );
}
