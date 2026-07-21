select
    reporting_month,
    artist_id,
    currency,
    round(sum(artist_payout_amount), 2) as monthly_payout_amount,
    count(*) as settlement_count
from {{ ref('royalty_ledger') }}
group by 1, 2, 3

