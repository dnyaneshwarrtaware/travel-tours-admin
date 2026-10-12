import { useState } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { routesApi } from '../../services/adminService';
import { PageHeader, ActiveBadge } from '../../components/admin/AdminUI';
import { Loading, ErrorState, EmptyState } from '../../components/common/ui';
import StopsEditor from '../../components/admin/StopsEditor';
import FaresEditor from '../../components/admin/FaresEditor';
import { formatDuration } from '../../utils/format';

// Route detail with Stops / Fares tabs. Also reused by the "Route Stops" and "Fares" sidebar pages.
export function RouteWorkbench({ routeId, tab }) {
  const route = useData(() => routesApi.get(routeId), [routeId]);
  if (route.loading) return <Loading />;
  if (route.error) return <ErrorState error={route.error} onRetry={route.reload} />;
  const r = route.data;
  return (
    <div className="ad-card">
      <div className="ad-card-head">
        <h3>{r.from_city} → {r.to_city}{r.name ? ` · ${r.name}` : ''}</h3>
        <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <ActiveBadge active={r.is_active} /><span className="ui-muted">{r.duration_minutes ? formatDuration(r.duration_minutes) : 'No timings yet'}</span>
        </span>
      </div>
      <div className="ad-card-pad">
        {tab === 'stops' ? <StopsEditor route={r} onSaved={route.reload} /> : <FaresEditor route={r} onSaved={route.reload} />}
      </div>
    </div>
  );
}

export default function AdminRouteDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || (can('routes.manage') ? 'stops' : 'fares');
  return (
    <div className="ad-page">
      <PageHeader title="Manage route" subtitle={<><Link to="/admin/routes">Routes</Link> / stops, timings and segment fares</>} />
      <div className="ad-tabs" role="tablist">
        {can('routes.manage') && <button type="button" role="tab" className={tab === 'stops' ? 'is-active' : ''} onClick={() => setParams({ tab: 'stops' })}>Stops & timings</button>}
        {can('fares.manage') && <button type="button" role="tab" className={tab === 'fares' ? 'is-active' : ''} onClick={() => setParams({ tab: 'fares' })}>Segment fares</button>}
      </div>
      <RouteWorkbench routeId={id} tab={tab} />
    </div>
  );
}

// Sidebar pages: pick a route, then edit its stops or fares
export function RoutePickerPage({ tab }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const routes = useData(() => routesApi.list(), []);
  const [routeId, setRouteId] = useState(params.get('route') || '');
  const selected = routeId || routes.data?.[0]?.id;

  return (
    <div className="ad-page">
      <PageHeader title={tab === 'stops' ? 'Route Stops' : 'Fares'}
        subtitle={tab === 'stops' ? 'Stop sequence, arrival/departure times and boarding/dropping rules' : 'Fare for every boarding → dropping segment (₹ per seat)'}
        actions={(
          <select className="form-control" style={{ minWidth: 240 }} value={selected || ''} onChange={e => { setRouteId(e.target.value); navigate(`?route=${e.target.value}`, { replace: true }); }}>
            {(routes.data || []).map(r => <option key={r.id} value={r.id}>{r.from_city} → {r.to_city}{r.name ? ` · ${r.name}` : ''}{r.is_active ? '' : ' (inactive)'}</option>)}
          </select>
        )} />
      {routes.loading ? <Loading /> : routes.error ? <ErrorState error={routes.error} onRetry={routes.reload} />
        : !selected ? <EmptyState title="No routes yet" action={<Link className="btn btn-navy btn-sm" to="/admin/routes">Create a route</Link>} />
        : <RouteWorkbench routeId={selected} tab={tab} />}
    </div>
  );
}
