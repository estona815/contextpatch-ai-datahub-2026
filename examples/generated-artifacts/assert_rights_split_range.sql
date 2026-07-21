-- synthetic: true
select settlement_id, artist_share
from {{ ref('stg_dsp_streams') }}
where not invalid_rights_split
  and (artist_share < 0 or artist_share > 1 or artist_share is null)

