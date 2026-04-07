
# a:\UnityProjects\ManagerFork\AntigravityManager\cli\proto_utils.py
import struct
import base64

def encode_varint(value: int) -> bytes:
    if value < 0:
        raise ValueError("Varint encoding only supports non-negative integers. Use zigzag encoding for signed values.")
    
    buf = []
    val = value
    while val >= 128:
        buf.append((val & 0x7F) | 0x80)
        val >>= 7
    buf.append(val)
    return bytes(buf)


def read_varint(data: bytes, offset: int) -> tuple[int, int]:
    result = 0
    shift = 0
    pos = offset
    length = len(data)
    
    while pos < length:
        byte = data[pos]
        result |= (byte & 0x7F) << shift
        pos += 1
        if (byte & 0x80) == 0:
            return result, pos
        shift += 7
    raise ValueError("Incomplete varint data")

def create_string_field(field_num: int, value: str) -> bytes:
    tag = (field_num << 3) | 2
    tag_bytes = encode_varint(tag)
    value_bytes = value.encode('utf-8')
    len_bytes = encode_varint(len(value_bytes))
    return tag_bytes + len_bytes + value_bytes

def create_timestamp_field(field_num: int, seconds: int) -> bytes:
    # Timestamp message: Field 1 (seconds) as varint. 
    # But usually Timestamp is int64, using varint here as per TS code logic.
    inner_tag = (1 << 3) | 0
    inner_tag_bytes = encode_varint(inner_tag)
    seconds_bytes = encode_varint(seconds)
    
    inner_msg = inner_tag_bytes + seconds_bytes
    
    tag = (field_num << 3) | 2
    tag_bytes = encode_varint(tag)
    len_bytes = encode_varint(len(inner_msg))
    
    return tag_bytes + len_bytes + inner_msg

def create_oauth_info(access_token: str, refresh_token: str, expiry: int) -> bytes:
    # Field 1: Access Token (String)
    field1 = create_string_field(1, access_token)
    
    # Field 2: Type ("Bearer")
    field2 = create_string_field(2, "Bearer")
    
    # Field 3: Refresh Token (String)
    field3 = create_string_field(3, refresh_token)
    
    # Field 4: Expiry (Timestamp wrapped in len delim)
    # The TS code creates a Timestamp message (field 1 -> seconds) wrapped as field 4 (len delim).
    field4 = create_timestamp_field(4, expiry)
    
    return field1 + field2 + field3 + field4

def create_unified_oauth_token(access_token: str, refresh_token: str, expiry: int) -> str:
    oauth_info = create_oauth_info(access_token, refresh_token, expiry)
    # Base64 encode the OAuth token info
    oauth_info_b64 = base64.b64encode(oauth_info).decode('utf-8')
    
    # Inner structure:
    # Field 1: string "oauthTokenInfoSentinelKey"
    # Field 2: string (base64 of oauth info) -> Wait, TS uses createStringField(1, oauthInfoB64) then createStringField(1, sentinel)??
    # Let's re-read TS carefully:
    # const inner1 = this.encodeStringField(1, 'oauthTokenInfoSentinelKey'); -> Field 1
    # const inner2 = this.encodeStringField(1, oauthInfoB64); -> Actually createStringField(1, ...)
    # WAIT! The TS code has:
    # const inner2 = this.encodeStringField(1, oauthInfoB64);
    # const inner1 = this.encodeStringField(1, 'oauthTokenInfoSentinelKey');
    # const innerField2 = this.encodeLenDelimField(2, inner2); -> This seems wrong in my reading or TS variable naming.
    # Ah, `inner2` is created as Field 1 string. Then it is wrapped in Field 2? 
    # Let's look at `createUnifiedOAuthToken` in TS again.
    
    # TS Logic:
    # 1. oauthInfo = createOAuthInfo(...)
    # 2. oauthInfoB64 = base64(oauthInfo)
    # 3. inner2 = encodeStringField(1, oauthInfoB64) -> This creates a Field 1 tag + len + string.
    # 4. inner1 = encodeStringField(1, 'oauthTokenInfoSentinelKey') -> Field 1 tag + len + string.
    # 5. innerField2 = encodeLenDelimField(2, inner2) -> Wraps `inner2` (which is already a field) into a Field 2?
    #    No, `encodeLenDelimField` takes `data` and wraps it. So `inner2` content becomes body of Field 2.
    #    So Field 2 contains (Field 1: oauthInfoB64).
    # 6. inner = inner1 + innerField2
    #    So `inner` is:
    #      Field 1: "oauthTokenInfoSentinelKey"
    #      Field 2: { Field 1: "base64..." }
    # 7. outer = encodeLenDelimField(1, inner)
    #    So `outer` is:
    #      Field 1: { ...inner... }
    # 8. Return base64(outer).
    
    # My implementation:
    inner2_data = create_string_field(1, oauth_info_b64)
    # Wrap inner2_data in Field 2
    # encode_len_delim_field(2, inner2_data) logic:
    tag2 = (2 << 3) | 2
    tag2_bytes = encode_varint(tag2)
    len2_bytes = encode_varint(len(inner2_data))
    inner_field2 = tag2_bytes + len2_bytes + inner2_data
    
    inner1 = create_string_field(1, 'oauthTokenInfoSentinelKey')
    
    inner = inner1 + inner_field2
    
    # Wrap inner in Field 1
    tag1 = (1 << 3) | 2
    tag1_bytes = encode_varint(tag1)
    len1_bytes = encode_varint(len(inner))
    outer = tag1_bytes + len1_bytes + inner
    
    return base64.b64encode(outer).decode('utf-8')
