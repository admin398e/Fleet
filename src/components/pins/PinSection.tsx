import type { Database, PinType } from "@/types/database";
import { NavigateButton } from "./NavigateButton";
import { ConfirmButton } from "./ConfirmButton";
import { PinEditor } from "./PinEditor";

type PinRow = Database["public"]["Views"]["pins_with_confirmations"]["Row"];

/**
 * Renders one category (door or parking). The top pin (most confirmations) is
 * the "best" one and gets the prominent Navigate action; other contributions
 * are listed below so drivers can compare.
 */
export function PinSection({
  title,
  pinType,
  addressId,
  pins,
  confirmedPinIds,
}: {
  title: string;
  pinType: PinType;
  addressId: string;
  pins: PinRow[];
  confirmedPinIds: string[];
}) {
  const best = pins[0];
  const others = pins.slice(1);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h2>

      {best ? (
        <div className="card flex flex-col gap-3">
          <PinMeta pin={best} />
          <NavigateButton lat={best.lat} lng={best.lng} label={title} />
          <ConfirmButton
            pinId={best.id}
            addressId={addressId}
            confirmed={confirmedPinIds.includes(best.id)}
            count={best.confirmation_count}
          />
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          No {title.toLowerCase()} pin yet — be the first to drop one.
        </p>
      )}

      {others.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500">
            {others.length} other {others.length === 1 ? "suggestion" : "suggestions"}
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {others.map((p) => (
              <li key={p.id} className="card flex flex-col gap-2">
                <PinMeta pin={p} />
                <NavigateButton lat={p.lat} lng={p.lng} label={title} />
                <ConfirmButton
                  pinId={p.id}
                  addressId={addressId}
                  confirmed={confirmedPinIds.includes(p.id)}
                  count={p.confirmation_count}
                />
              </li>
            ))}
          </ul>
        </details>
      )}

      <PinEditor addressId={addressId} pinType={pinType} label={title} />
    </section>
  );
}

function PinMeta({ pin }: { pin: PinRow }) {
  return (
    <div>
      {pin.what3words ? (
        <p className="font-mono text-base font-semibold text-brand">
          {"///"}
          {pin.what3words}
        </p>
      ) : (
        <p className="text-sm text-gray-500">
          {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
