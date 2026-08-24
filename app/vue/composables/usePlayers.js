import { computed } from 'vue';

/**
 * Composable for accessing player/party management
 * Wraps the AngularJS players service
 */
export function usePlayers() {
  const players = computed(() => window.playersService);

  const parties = computed(() => players.value?.parties || []);
  const selectedParty = computed(() => players.value?.selectedParty || null);
  const raw = computed({
    get: () => players.value?.raw || '',
    set: (value) => {
      if (players.value) {
        players.value.raw = value;
      }
    }
  });

  const selectParty = (party) => {
    if (players.value?.selectParty) {
      players.value.selectParty(party);
    }
  };

  return {
    parties,
    selectedParty,
    raw,
    selectParty,
  };
}
