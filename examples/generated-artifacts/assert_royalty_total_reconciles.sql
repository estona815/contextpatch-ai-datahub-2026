-- synthetic: true
-- returns a row only when payable revenue differs from gross revenue less platform fee
select
    reporting_month,
    round(sum(net_amount), 2) as payable_total,
    round(sum(gross_revenue - platform_fee), 2) as expected_total
from {{ ref('stg_dsp_streams') }}
where not invalid_rights_split
group by 1
having abs(sum(net_amount) - sum(gross_revenue - platform_fee)) > 0.01

