-- synthetic: true
-- settlement identifiers may repeat across reporting periods, but never within one period
select
    settlement_id,
    reporting_month,
    count(*) as duplicate_count
from {{ ref('stg_dsp_streams') }}
where not invalid_rights_split
group by 1, 2
having count(*) > 1
