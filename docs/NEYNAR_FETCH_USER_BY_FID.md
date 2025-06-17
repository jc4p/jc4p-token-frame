
Neynar home pagedark logo

Search...
Ctrl K

Ask AI
Log in
neynarxyz/oas
20

Home
Tutorials
API Reference
Status
Blog
Overview
Quickstart
Rate Limits
Compute Units Pricing
Farcaster
User
Fetch User Information
Overview
GET
Search for Usernames
GET
By FIDs (Farcaster IDs)
GET
By Eth or Sol addresses
GET
By custody-address
GET
By username
GET
By X username
GET
By location
Fetch User's Casts
Register New User
Update User Profile
GET
User interactions
GET
Fetch authorization url
Auth Address
Signer
Cast
Feed
Reaction
Notifications
Channel
Social Graph
Storage
Mini Apps
Mini App Hosts
Agents
Fname
Webhook
Action
Mute
Block
Ban
Onchain
Login
Metrics
Onchain
POST
Deploy fungible
Farcaster Hub API
Info
Casts
Reactions
Links
UserData
Fids
Storage
Usernames
Verifications
OnChainEvents
Message
HubEvents
Neynar SDK
Getting Started with Neynar NodeJS SDK
NodeJS SDK v1 to v2 migration guide
Getting Started with Neynar Rust SDK
Getting Started with Neynar Go SDK
Github
NodeJS-SDK
Frontend React SDK
OpenAPI Specification
Example Apps
Fetch User Information
By FIDs
Fetches information about multiple users based on FIDs

GET
/
v2
/
farcaster
/
user
/
bulk
/

Try it
Authorizations
​
x-api-key
stringheaderdefault:NEYNAR_API_DOCSrequired
API key to authorize requests

Headers
​
x-neynar-experimental
booleandefault:false
Enables experimental features including filtering based on the Neynar score. See docs for more details.

Query Parameters
​
fids
stringrequired
Comma separated list of FIDs, up to 100 at a time

Example:
"194, 191, 6131"

​
viewer_fid
integer
Required range: x >= 1
Example:
3

Response
200

200
application/json
Success

​
users
User · object[]required

Show child attributes

Was this page helpful?


Yes

No
Search for Usernames
By Eth or Sol addresses
telegram
github
Powered by Mintlify

cURL

Python

JavaScript

PHP

Go

Java

Copy

Ask AI
curl --request GET \
  --url https://api.neynar.com/v2/farcaster/user/bulk/ \
  --header 'x-api-key: <api-key>'

200

400

Copy

Ask AI
{
  "users": [
    {
      "object": "user",
      "fid": 3,
      "username": "<string>",
      "display_name": "<string>",
      "custody_address": "0x5a927ac639636e534b678e81768ca19e2c6280b7",
      "pfp_url": "<string>",
      "profile": {
        "bio": {
          "text": "<string>",
          "mentioned_profiles": [
            {
              "object": "user_dehydrated",
              "fid": 3,
              "username": "<string>",
              "display_name": "<string>",
              "pfp_url": "<string>",
              "custody_address": "0x5a927ac639636e534b678e81768ca19e2c6280b7"
            }
          ],
          "mentioned_profiles_ranges": [
            {
              "start": 1,
              "end": 1
            }
          ],
          "mentioned_channels": [
            {
              "id": "<string>",
              "name": "<string>",
              "object": "channel_dehydrated",
              "image_url": "<string>",
              "viewer_context": {
                "following": true,
                "role": "member"
              }
            }
          ],
          "mentioned_channels_ranges": [
            {
              "start": 1,
              "end": 1
            }
          ]
        },
        "location": {
          "latitude": 0,
          "longitude": 0,
          "address": {
            "city": "<string>",
            "state": "<string>",
            "state_code": "<string>",
            "country": "<string>",
            "country_code": "<string>"
          },
          "radius": 1
        },
        "banner_url": "<string>"
      },
      "follower_count": 123,
      "following_count": 123,
      "verifications": [
        "0x5a927ac639636e534b678e81768ca19e2c6280b7"
      ],
      "verified_addresses": {
        "eth_addresses": [
          "0x5a927ac639636e534b678e81768ca19e2c6280b7"
        ],
        "sol_addresses": [
          "<string>"
        ],
        "primary": {
          "eth_address": "0x5a927ac639636e534b678e81768ca19e2c6280b7",
          "sol_address": "<string>"
        }
      },
      "verified_accounts": [
        {
          "platform": "x",
          "username": "<string>"
        }
      ],
      "power_badge": true,
      "experimental": {
        "deprecation_notice": "<string>",
        "neynar_user_score": 123
      },
      "viewer_context": {
        "following": true,
        "followed_by": true,
        "blocking": true,
        "blocked_by": true
      },
      "score": 123
    }
  ]
}
By FIDs - Neynar
