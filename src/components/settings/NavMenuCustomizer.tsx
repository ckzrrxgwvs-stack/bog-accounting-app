import { ChevronDown, ChevronUp, Eye, EyeOff, Menu } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNavCustomization } from '@/context/NavCustomizationContext';
import { NAV_CATALOG, NAV_GROUP_ORDER } from '@/lib/navCatalog';

/** Pick which sidebar menu items show and in what order. */
export function NavMenuCustomizer() {
  const { hasModuleAccess, user } = useAuthStore();
  const nav = useNavCustomization();
  const isExecutive = Boolean(
    user && (user.role === 'PRESIDENT' || user.role === 'CFO' || user.role === 'CONTROLLER')
  );

  const accessible = nav.sortedCatalog.filter((item) => {
    if (item.executiveOnly && !isExecutive) return false;
    if (item.module === '_executive_only') return isExecutive;
    return hasModuleAccess(item.module);
  });

  const byGroup = NAV_GROUP_ORDER.map((group) => ({
    group,
    items: accessible.filter((item) => item.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Menu size={18} className="text-gray-700" />
        <div>
          <h3 className="font-semibold text-black">Menu choices</h3>
          <p className="text-sm text-gray-500">
            Show only what you use — hide modules you don&apos;t need and reorder the sidebar to match your workflow.
          </p>
        </div>
      </div>

      {byGroup.map(({ group, items }) => (
        <div key={group} className="rounded-lg border border-gray-200 overflow-hidden">
          <p className="bg-gray-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-600">{group}</p>
          <ul className="divide-y divide-gray-100">
            {items.map((item) => {
              const visible = nav.isVisible(item.id);
              return (
                <li key={item.id} className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    title={visible ? 'Hide from menu' : 'Show in menu'}
                    aria-label={visible ? `Hide ${item.name}` : `Show ${item.name}`}
                    onClick={() => nav.setVisible(item.id, !visible)}
                    className={`rounded p-1.5 transition-colors ${
                      visible ? 'text-black hover:bg-gray-100' : 'text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <span className={`min-w-0 flex-1 truncate text-sm ${visible ? 'text-black' : 'text-gray-400 line-through'}`}>
                    {item.name}
                  </span>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      aria-label={`Move ${item.name} up`}
                      onClick={() => nav.moveItem(item.id, 'up')}
                      className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-black"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${item.name} down`}
                      onClick={() => nav.moveItem(item.id, 'down')}
                      className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-black"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <p className="text-xs text-gray-500">
        Hidden items stay reachable via <strong>⌘K</strong> quick navigation. {NAV_CATALOG.length} modules in catalog.
      </p>
      <button
        type="button"
        onClick={nav.resetNavCustomization}
        className="text-sm font-medium text-gray-600 underline hover:text-black"
      >
        Reset menu to defaults
      </button>
    </div>
  );
}
