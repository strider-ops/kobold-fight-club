// Encounter management composable for Vue
import { ref, computed } from 'vue';

export function useEncounter() {
  // Access the AngularJS encounter service via window
  function getEncounter() {
    return window.encounterService;
  }

  const groups = computed(() => {
    const enc = getEncounter();
    return enc ? enc.groups : {};
  });

  const quantity = computed(() => {
    const enc = getEncounter();
    if (!enc) return 0;
    let qty = 0;
    Object.values(enc.groups).forEach(group => {
      qty += group.qty || 0;
    });
    return qty;
  });

  const totalExp = computed(() => {
    const enc = getEncounter();
    if (!enc) return 0;
    let exp = 0;
    Object.values(enc.groups).forEach(group => {
      if (group.monster && group.monster.cr) {
        exp += group.monster.cr.exp * group.qty;
      }
    });
    return exp;
  });

  const reference = computed({
    get() {
      const enc = getEncounter();
      return enc ? enc.reference : null;
    },
    set(value) {
      const enc = getEncounter();
      if (enc) {
        enc.reference = value;
      }
    }
  });

  // Create placeholder text from current groups
  const placeholder = computed(() => {
    const enc = getEncounter();
    if (!enc) return '';
    const parts = [];
    Object.values(enc.groups).forEach(group => {
      if (group.monster) {
        const prefix = group.qty > 1 ? `${group.qty}x` : '';
        parts.push(`${prefix}${group.monster.name}`.trim());
      }
    });
    return parts.join(', ');
  });

  // Reset encounter with a stored encounter
  function resetEncounter(storedEncounter) {
    const enc = getEncounter();
    if (enc && enc.reset) {
      enc.reset(storedEncounter);
    }
  }

  return {
    groups,
    quantity,
    totalExp,
    reference,
    placeholder,
    resetEncounter,
  };
}
