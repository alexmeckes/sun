import { useState } from 'react';

type Props = {
  onSearch: (query: string) => Promise<void>;
  loading: boolean;
};

export function AddressBar({ onSearch, loading }: Props) {
  const [q, setQ] = useState('');
  return (
    <form
      className="address-bar"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!q.trim() || loading) return;
        await onSearch(q.trim());
      }}
    >
      <input
        type="text"
        placeholder="Enter an address (e.g. 1600 Amphitheatre Pkwy, Mountain View)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={loading}
      />
      <button type="submit" disabled={loading || !q.trim()}>
        {loading ? 'Loading…' : 'Go'}
      </button>
    </form>
  );
}
