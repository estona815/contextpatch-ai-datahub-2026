-- synthetic: true
-- source incident: inc-2026-07-dsp-001
-- context snapshot: recorded-datahub-context-replay
with provider_v1 as (
    select
        settlement_id,
        dsp_name,
        reporting_month,
        isrc,
        artist_id,
        territory_code,
        stream_count,
        gross_revenue,
        platform_fee,
        cast(artist_share as decimal(18, 6)) as artist_share,
        cast(net_amount as decimal(18, 2)) as net_amount,
        currency,
        payout_status,
        'provider-v1' as source_schema_version,
        artist_share is null or artist_share < 0 or artist_share > 1 as invalid_rights_split
    from {{ ref('raw_dsp_settlements_v1') }}
),

provider_v2 as (
    select
        settlement_id,
        dsp_name,
        reporting_month,
        isrc,
        artist_id,
        territory_code,
        stream_count,
        gross_revenue,
        platform_fee,
        cast(
            case
                when rights_split_pct between 0 and 1 then rights_split_pct
                when rights_split_pct > 1 and rights_split_pct <= 100 then rights_split_pct / 100.0
                else null
            end as decimal(18, 6)
        ) as artist_share,
        cast(payable_revenue as decimal(18, 2)) as net_amount,
        currency,
        payout_status,
        'provider-v2' as source_schema_version,
        rights_split_pct is null or rights_split_pct < 0 or rights_split_pct > 100 as invalid_rights_split
    from {{ ref('raw_dsp_settlements_v2') }}
)

select * from provider_v1
union all
select * from provider_v2

