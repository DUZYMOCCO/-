import { actorFloor, actorWorldY, houseRoofFloor } from './floors.js';

const ROOF_LANDING = 0.28;

function edgePoint(a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const px = Math.max(0, Math.abs(dx) - (a.w + b.w) / 2);
  const pz = Math.max(0, Math.abs(dz) - (a.d + b.d) / 2);
  let ax = a.x;
  let az = a.z;
  let bx = b.x;
  let bz = b.z;
  let gap;
  if (px > 0 || Math.abs(dx) > Math.abs(dz)) {
    const side = Math.sign(dx || 1);
    const edgeAx = a.x + side * a.w / 2;
    const edgeBx = b.x - side * b.w / 2;
    gap = Math.hypot(edgeBx - edgeAx, Math.max(0, Math.abs(b.z - a.z) - (a.d + b.d) / 2));
    ax = edgeAx - side * ROOF_LANDING;
    bx = edgeBx + side * ROOF_LANDING;
    az = Math.max(a.z - a.d / 2 + 0.45, Math.min(a.z + a.d / 2 - 0.45, b.z));
    bz = Math.max(b.z - b.d / 2 + 0.45, Math.min(b.z + b.d / 2 - 0.45, az));
  } else {
    const side = Math.sign(dz || 1);
    const edgeAz = a.z + side * a.d / 2;
    const edgeBz = b.z - side * b.d / 2;
    gap = Math.hypot(Math.max(0, Math.abs(b.x - a.x) - (a.w + b.w) / 2), edgeBz - edgeAz);
    az = edgeAz - side * ROOF_LANDING;
    bz = edgeBz + side * ROOF_LANDING;
    ax = Math.max(a.x - a.w / 2 + 0.45, Math.min(a.x + a.w / 2 - 0.45, b.x));
    bx = Math.max(b.x - b.w / 2 + 0.45, Math.min(b.x + b.w / 2 - 0.45, ax));
  }
  return { a: { x: ax, z: az }, b: { x: bx, z: bz }, gap, span: Math.hypot(bx - ax, bz - az) };
}

export function roofLinksForHouses(houses, { maxGap = 2.5, maxHeightDelta = 1.5 } = {}) {
  const list = Array.isArray(houses) ? houses : [];
  const links = [];
  for (let i = 0; i < list.length; i += 1) {
    const a = list[i];
    if (!a?.stairs || !a.roofEntry) continue;
    for (let j = i + 1; j < list.length; j += 1) {
      const b = list[j];
      if (!b?.stairs || !b.roofEntry) continue;
      const points = edgePoint(a, b);
      if (points.gap > maxGap + 1e-9) continue;
       const ya = actorWorldY(a, houseRoofFloor(a), a.x, a.z);
       const yb = actorWorldY(b, houseRoofFloor(b), b.x, b.z);
      if (Math.abs(ya - yb) > maxHeightDelta + 1e-9) continue;
      links.push({
        id: `${a.id}:${b.id}`,
        a: a.id,
        b: b.id,
        gap: Math.round(points.gap * 1000) / 1000,
        span: Math.round(points.span * 1000) / 1000,
        yA: ya,
        yB: yb,
        aPoint: points.a,
        bPoint: points.b,
      });
    }
  }
  return links.sort((a, b) => a.a.localeCompare(b.a) || a.b.localeCompare(b.b));
}

export function ensureRoofLinks(town) {
  if (!town || !Array.isArray(town.houses)) return [];
  town.roofLinks = roofLinksForHouses(town.houses);
  return town.roofLinks;
}

function stairPoint(house, floor) {
  const points = house?.stairs?.points || [];
  return points.find((point) => point.floor === floor) || null;
}

function graphFor(houses, links) {
  const nodes = new Map();
  const edges = new Map();
  const addNode = (house, floor, point) => {
    const id = `${house.id}@${floor}`;
    if (!nodes.has(id)) {
      nodes.set(id, { id, houseId: house.id, floor, x: point.x, z: point.z });
      edges.set(id, []);
    }
    return id;
  };
  for (const house of houses || []) {
    if (!house.stairs) continue;
    const points = house.stairs.points || [];
    for (const point of points) addNode(house, point.floor, point);
    for (let i = 1; i < points.length; i += 1) {
      const a = addNode(house, points[i - 1].floor, points[i - 1]);
      const b = addNode(house, points[i].floor, points[i]);
      edges.get(a).push({ to: b, kind: 'stairs', point: points[i] });
      edges.get(b).push({ to: a, kind: 'stairs', point: points[i - 1] });
    }
  }
  for (const link of links || []) {
    const aHouse = houses.find((house) => house.id === link.a);
    const bHouse = houses.find((house) => house.id === link.b);
    if (!aHouse?.stairs || !bHouse?.stairs) continue;
    const aRoof = houseRoofFloor(aHouse);
    const bRoof = houseRoofFloor(bHouse);
    const a = addNode(aHouse, aRoof, link.aPoint);
    const b = addNode(bHouse, bRoof, link.bPoint);
    edges.get(a).push({ to: b, kind: 'roof', point: { ...link.bPoint, floor: bRoof } });
    edges.get(b).push({ to: a, kind: 'roof', point: { ...link.aPoint, floor: aRoof } });
  }
  return { nodes, edges };
}

export function findFloorPath(houses, links, fromHouseId, fromFloor, toHouseId, toFloor) {
  const list = Array.isArray(houses) ? houses : [];
  const startHouse = list.find((house) => house.id === fromHouseId);
  const endHouse = list.find((house) => house.id === toHouseId);
  if (!startHouse || !endHouse || !startHouse.stairs || !endHouse.stairs) return null;
  const graph = graphFor(list, links || roofLinksForHouses(list));
  const startPoint = stairPoint(startHouse, actorFloor({ floor: fromFloor }));
  const endPoint = stairPoint(endHouse, actorFloor({ floor: toFloor }));
  if (!startPoint || !endPoint) return null;
  const start = `${startHouse.id}@${startPoint.floor}`;
  const end = `${endHouse.id}@${endPoint.floor}`;
  if (start === end) return [{ ...endPoint, houseId: endHouse.id, kind: 'floor' }];
  const queue = [start];
  const previous = new Map([[start, null]]);
  const via = new Map();
  for (let i = 0; i < queue.length && !previous.has(end); i += 1) {
    const current = queue[i];
    for (const edge of graph.edges.get(current) || []) {
      if (previous.has(edge.to)) continue;
      previous.set(edge.to, current);
      via.set(edge.to, edge);
      queue.push(edge.to);
    }
  }
  if (!previous.has(end)) return null;
  const nodes = [];
  let cursor = end;
  while (cursor !== start) {
    nodes.push({ node: graph.nodes.get(cursor), edge: via.get(cursor) });
    cursor = previous.get(cursor);
  }
  nodes.reverse();
  const route = [];
  for (const { node, edge } of nodes) {
    const previousNode = route[route.length - 1];
    if (edge.kind === 'roof') {
      const exit = [...(links || roofLinksForHouses(list))].find((link) =>
        (link.a === previousNode?.houseId && link.b === node.houseId) ||
        (link.b === previousNode?.houseId && link.a === node.houseId));
      if (exit) {
        const isForward = exit.a === previousNode?.houseId;
        const near = isForward ? exit.aPoint : exit.bPoint;
        const far = isForward ? exit.bPoint : exit.aPoint;
        route.push({ ...near, floor: previousNode.floor, houseId: previousNode.houseId, kind: 'roof-edge' });
        route.push({ ...far, floor: node.floor, houseId: node.houseId, kind: 'roof-edge' });
      }
    }
    route.push({ ...edge.point, floor: node.floor, houseId: node.houseId, kind: edge.kind });
  }
  return route;
}

export function floorRouteForActors(state, actor, targetHouse, targetFloor, targetPoint) {
  const houses = state?.town?.houses || [];
  const links = state?.town?.roofLinks || roofLinksForHouses(houses);
  const startHouse = houses.find((house) => Math.abs(actor.x - house.x) < house.w / 2 - 0.52 && Math.abs(actor.z - house.z) < house.d / 2 - 0.52) ||
    houses.find((house) => actorFloor(actor) > 0 && house.stairs && Math.hypot(actor.x - house.roofEntry.x, actor.z - house.roofEntry.z) < 1.1);
  const route = [];
  if (!targetHouse) {
    if (actorFloor(actor) <= 0 || !startHouse?.stairs) return null;
    const ground = findFloorPath(houses, links, startHouse.id, actorFloor(actor), startHouse.id, 0);
    if (!ground) return null;
    route.push(...ground);
    route.push({ x: startHouse.door.x + startHouse.nx * 1.15, z: startHouse.door.z + startHouse.nz * 1.15, floor: 0, houseId: startHouse.id, kind: 'exit' });
    if (targetPoint) route.push({ ...targetPoint, floor: 0, kind: 'destination' });
    return route;
  }
  if (!targetHouse.stairs) {
    if (actorFloor(actor) <= 0 || !startHouse?.stairs || targetFloor !== 0) return null;
    const ground = findFloorPath(houses, links, startHouse.id, actorFloor(actor), startHouse.id, 0);
    if (!ground) return null;
    route.push(...ground);
    route.push({ x: startHouse.door.x + startHouse.nx * 1.15, z: startHouse.door.z + startHouse.nz * 1.15, floor: 0, houseId: startHouse.id, kind: 'exit' });
    if (targetPoint) route.push({ ...targetPoint, floor: 0, kind: 'destination' });
    return route;
  }
  if (!startHouse) {
    if (actorFloor(actor) > 0) return null;
    route.push({ x: targetHouse.door.x - targetHouse.nx * 0.85, z: targetHouse.door.z - targetHouse.nz * 0.85, floor: 0, houseId: targetHouse.id, kind: 'entry' });
    const internal = findFloorPath(houses, links, targetHouse.id, 0, targetHouse.id, targetFloor);
    if (!internal) return null;
    route.push(...internal);
  } else {
    const start = findFloorPath(houses, links, startHouse.id, actorFloor(actor), targetHouse.id, targetFloor);
    if (!start) return null;
    route.push(...start);
  }
  if (targetPoint && route.length) route.push({ ...targetPoint, floor: targetFloor, houseId: targetHouse.id, kind: 'destination' });
  return route;
}

