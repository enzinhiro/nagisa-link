import Link from "next/link";

/**
 * Subtle footer link to the operator page on /auth (login & signup).
 * Remove this component and its two usages in auth/page.tsx to drop the feature.
 */
export function OperatorLink() {
  return (
    <div className="mt-4 flex w-full justify-center">
      <Link
        href="/operator"
        className="inline-flex min-h-[44px] min-w-[min(100%,12rem)] items-center justify-center px-3 py-2 text-center text-sm leading-snug text-[#7b93a2] transition-colors hover:text-[#5b7a8f] hover:underline hover:decoration-[#b8d4e8] hover:underline-offset-2"
      >
        運営元：ENZIN - 縁人 -
      </Link>
    </div>
  );
}
