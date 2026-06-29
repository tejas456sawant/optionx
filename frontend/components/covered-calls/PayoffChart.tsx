import { money } from "./format";
import type { Opportunity } from "./types";

function payoffPoints(opportunity: Opportunity) {
  const low = Math.max(opportunity.underlyingPrice * 0.35, 1);
  const high = opportunity.underlyingPrice * 1.35;
  return Array.from({ length: 32 }, (_, index) => {
    const price = low + ((high - low) * index) / 31;
    const stockPnL = (price - opportunity.underlyingPrice) * 100;
    const callPnL = -Math.max(price - opportunity.strike, 0) * 100;
    const premium = opportunity.premium * 100;
    return { price, pnl: stockPnL + callPnL + premium };
  });
}

export function PayoffChart({ opportunity }: { opportunity: Opportunity }) {
  const points = payoffPoints(opportunity);
  const minPnl = Math.min(...points.map((point) => point.pnl), 0);
  const maxPnl = Math.max(...points.map((point) => point.pnl), 0);
  const width = 560;
  const height = 260;
  const pad = 28;
  const xMin = points[0].price;
  const xMax = points[points.length - 1].price;
  const ySpan = maxPnl - minPnl || 1;
  const x = (price: number) => pad + ((price - xMin) / (xMax - xMin)) * (width - pad * 2);
  const y = (pnl: number) => height - pad - ((pnl - minPnl) / ySpan) * (height - pad * 2);
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(point.price)} ${y(point.pnl)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
      <line x1={pad} x2={width - pad} y1={y(0)} y2={y(0)} className="stroke-border" />
      <line
        x1={x(opportunity.breakeven)}
        x2={x(opportunity.breakeven)}
        y1={pad}
        y2={height - pad}
        className="stroke-muted-foreground"
        strokeDasharray="4 4"
      />
      <line
        x1={x(opportunity.strike)}
        x2={x(opportunity.strike)}
        y1={pad}
        y2={height - pad}
        className="stroke-primary"
        strokeDasharray="4 4"
      />
      <path d={path} fill="none" className="stroke-primary" strokeWidth="3" />
      <text x={pad} y={height - 6} className="fill-muted-foreground text-[11px]">
        {money(xMin)}
      </text>
      <text x={width - 92} y={height - 6} className="fill-muted-foreground text-[11px]">
        {money(xMax)}
      </text>
      <text x={x(opportunity.breakeven) + 4} y={pad + 14} className="fill-muted-foreground text-[11px]">
        BE {money(opportunity.breakeven)}
      </text>
      <text x={x(opportunity.strike) + 4} y={pad + 30} className="fill-primary text-[11px]">
        Strike {money(opportunity.strike)}
      </text>
    </svg>
  );
}
