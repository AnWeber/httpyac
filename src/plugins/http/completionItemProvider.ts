import { completionItemProvider } from '../../io';
import { isHttpRequest } from '../../utils';

completionItemProvider.emptyLineProvider.push(() => [
  {
    name: 'GET',
    description:
      'The GET method requests a representation of the specified resource. Requests using GET should only retrieve data.',
  },
  {
    name: 'HEAD',
    description:
      'The GET method requests a representation of the specified resource. Requests using GET should only retrieve data.',
  },
  {
    name: 'POST',
    description:
      'The POST method is used to submit an entity to the specified resource, often causing a change in state or side effects on the server.',
  },
  {
    name: 'PUT',
    description: 'The PUT method replaces all current representations of the target resource with the request payload.',
  },
  {
    name: 'DELETE',
    description: 'The DELETE method deletes the specified resource.',
  },
  {
    name: 'CONNECT',
    description: 'The CONNECT method establishes a tunnel to the server identified by the target resource.',
  },
  {
    name: 'OPTIONS',
    description: 'The OPTIONS method is used to describe the communication options for the target resource.',
  },
  {
    name: 'TRACE',
    description: 'The TRACE method performs a message loop-back test along the path to the target resource.',
  },
  {
    name: 'PATCH',
    description: 'The PATCH method is used to apply partial modifications to a resource.',
  },
]);

completionItemProvider.requestHeaderProvider.push(request => {
  if (isHttpRequest(request)) {
    return [
      {
        name: 'A-IM',
        description: 'Acceptable instance-manipulations for the request.',
      },
      {
        name: 'Accept',
        description: 'Media type(s) that is/are acceptable for the response. See Content negotiation.',
      },
      {
        name: 'Accept-Charset',
        description: 'Character sets that are acceptable.',
      },
      {
        name: 'Accept-Datetime',
        description: 'Acceptable version in time.',
      },
      {
        name: 'Accept-Encoding',
        description: 'List of acceptable encodings. See HTTP compression.',
      },
      {
        name: 'Accept-Language',
        description: 'List of acceptable human languages for response. See Content negotiation.',
      },
      {
        name: 'Access-Control-Request-Method',
        description: 'Initiates a request for cross-origin resource sharing with Origin (below).',
      },
      {
        name: 'Access-Control-Request-Headers',
        description: 'Initiates a request for cross-origin resource sharing with Origin (below).',
      },
      {
        name: 'Authorization',
        description: 'Authentication credentials for HTTP authentication.',
      },
      {
        name: 'Cache-Control',
        description:
          'Used to specify directives that must be obeyed by all caching mechanisms along the request-response chain.',
      },
      {
        name: 'Connection',
        description:
          'Control options for the current connection and list of hop-by-hop request fields. Must not be used with HTTP/2.',
      },
      {
        name: 'Content-Encoding',
        description: 'The type of encoding used on the data. See HTTP compression.',
      },
      {
        name: 'Content-Length',
        description: 'The length of the request body in octets (8-bit bytes).',
      },
      {
        name: 'Content-MD5',
        description: 'A Base64-encoded binary MD5 sum of the content of the request body.',
      },
      {
        name: 'Content-Type',
        description: 'The Media type of the body of the request (used with POST and PUT requests).',
      },
      {
        name: 'Cookie',
        description: 'An HTTP cookie previously sent by the server with Set-Cookie (below).',
      },
      {
        name: 'Date',
        description:
          'The date and time at which the message was originated (in "HTTP-date" format as defined by RFC 7231 Date/Time Formats).',
      },
      {
        name: 'Expect',
        description: 'Indicates that particular server behaviors are required by the client.',
      },
      {
        name: 'Forwarded',
        description: 'Disclose original information of a client connecting to a web server through an HTTP proxy.',
      },
      {
        name: 'From',
        description: 'The email address of the user making the request.',
      },
      {
        name: 'Host',
        description:
          'The domain name of the server (for virtual hosting), and the TCP port number on which the server is listening. The port number may be omitted if the port is the standard port for the service requested. Mandatory since HTTP/1.1. If the request is generated directly in HTTP/2, it should not be used.',
      },
      {
        name: 'HTTP2-Settings',
        description:
          'A request that upgrades from HTTP/1.1 to HTTP/2 MUST include exactly one HTTP2-Setting header field. The HTTP2-Settings header field is a connection-specific header field that includes parameters that govern the HTTP/2 connection, provided in anticipation of the server accepting the request to upgrade.',
      },
      {
        name: 'If-Match',
        description:
          'Only perform the action if the client supplied entity matches the same entity on the server. This is mainly for methods like PUT to only update a resource if it has not been modified since the user last updated it.',
      },
      {
        name: 'If-Modified-Since',
        description: 'Allows a 304 Not Modified to be returned if content is unchanged.',
      },
      {
        name: 'If-None-Match',
        description: 'Allows a 304 Not Modified to be returned if content is unchanged, see HTTP ETag.',
      },
      {
        name: 'If-Range',
        description:
          'If the entity is unchanged, send me the part(s) that I am missing; otherwise, send me the entire new entity.',
      },
      {
        name: 'If-Unmodified-Since',
        description: 'Only send the response if the entity has not been modified since a specific time.',
      },
      {
        name: 'Max-Forwards',
        description: 'Limit the number of times the message can be forwarded through proxies or gateways.',
      },
      {
        name: 'Origin',
        description:
          'Initiates a request for cross-origin resource sharing (asks server for Access-Control-* response fields).',
      },
      {
        name: 'Pragma',
        description:
          'Implementation-specific fields that may have various effects anywhere along the request-response chain.',
      },
      {
        name: 'Proxy-Authorization',
        description: 'Authorization credentials for connecting to a proxy.',
      },
      {
        name: 'Range',
        description: 'Request only part of an entity. Bytes are numbered from 0. See Byte serving.',
      },
      {
        name: 'Referer',
        description:
          'This is the address of the previous web page from which a link to the currently requested page was followed. (The word "referrer" has been misspelled in the RFC as well as in most implementations to the point that it has become standard usage and is considered correct terminology)',
      },
      {
        name: 'TE',
        description:
          'The transfer encodings the user agent is willing to accept: the same values as for the response header field Transfer-Encoding can be used, plus the "trailers" value (related to the "chunked" transfer method) to notify the server it expects to receive additional fields in the trailer after the last, zero-sized, chunk. Only trailers is supported in HTTP/2.',
      },
      {
        name: 'Trailer',
        description:
          'The Trailer general field value indicates that the given set of header fields is present in the trailer of a message encoded with chunked transfer coding.',
      },
      {
        name: 'Transfer-Encoding',
        description:
          'The form of encoding used to safely transfer the entity to the user. Currently defined methods are: chunked, compress, deflate, gzip, identity. Must not be used with HTTP/2',
      },
      {
        name: 'User-Agent',
        description: 'The user agent string of the user agent.',
      },
      {
        name: 'Upgrade',
        description: 'Ask the server to upgrade to another protocol. Must not be used in HTTP/2.',
      },
      {
        name: 'Via',
        description: 'Informs the server of proxies through which the request was sent.',
      },
      {
        name: 'Warning',
        description: 'A general warning about possible problems with the entity body.',
      },
      {
        name: 'Upgrade-Insecure-Requests',
        description:
          'Tells a server which (presumably in the middle of a HTTP -> HTTPS migration) hosts mixed content that the client would prefer redirection to HTTPS and can handle Content-Security-Policy: upgrade-insecure-requests Must not be used with HTTP/2',
      },
      {
        name: 'X-Requested-With',
        description:
          'Mainly used to identify Ajax requests (most JavaScript frameworks send this field with value of XMLHttpRequest); also identifies Android apps using WebView',
      },
      {
        name: 'DNT',
        description:
          'Requests a web application to disable their tracking of a user. This is Mozilla`s version of the X-Do-Not-Track header field (since Firefox 4.0 Beta 11). Safari and IE9 also have support for this field. On March 7, 2011, a draft proposal was submitted to IETF. The W3C Tracking Protection Working Group is producing a specification.',
      },
      {
        name: 'X-Forwarded-For',
        description:
          'A de facto standard for identifying the originating IP address of a client connecting to a web server through an HTTP proxy or load balancer. Superseded by Forwarded header.',
      },
      {
        name: 'X-Forwarded-Host',
        description:
          'A de facto standard for identifying the original host requested by the client in the Host HTTP request header, since the host name and/or port of the reverse proxy (load balancer) may differ from the origin server handling the request. Superseded by Forwarded header.',
      },
      {
        name: 'X-Forwarded-Proto',
        description:
          'A de facto standard for identifying the originating protocol of an HTTP request, since a reverse proxy (or a load balancer) may communicate with a web server using HTTP even if the request to the reverse proxy is HTTPS. An alternative form of the header (X-ProxyUser-Ip) is used by Google clients talking to Google servers. Superseded by Forwarded header.',
      },
      {
        name: 'Front-End-Https',
        description: 'Non-standard header field used by Microsoft applications and load-balancers',
      },
      {
        name: 'X-Http-Method-Override',
        description:
          'Requests a web application to override the method specified in the request (typically POST) with the method given in the header field (typically PUT or DELETE). This can be used when a user agent or firewall prevents PUT or DELETE methods from being sent directly (note that this is either a bug in the software component, which ought to be fixed, or an intentional configuration, in which case bypassing it may be the wrong thing to do).',
      },
      {
        name: 'X-ATT-DeviceId',
        description:
          'Allows easier parsing of the MakeModel/Firmware that is usually found in the User-Agent String of AT&T Devices',
      },
      {
        name: 'X-Wap-Profile',
        description:
          'Links to an XML file on the Internet with a full description and details about the device currently connecting. In the example to the right is an XML file for an AT&T Samsung Galaxy S2.',
      },
      {
        name: 'Proxy-Connection',
        description:
          'Implemented as a misunderstanding of the HTTP specifications. Common because of mistakes in implementations of early HTTP versions. Has exactly the same functionality as standard Connection field. Must not be used with HTTP/2.',
      },
      {
        name: 'X-UIDH',
        description:
          'Server-side deep packet insertion of a unique ID identifying customers of Verizon Wireless; also known as "perma-cookie" or "supercookie"',
      },
      {
        name: 'X-Csrf-Token',
        description:
          'Used to prevent cross-site request forgery. Alternative header names are: X-CSRFToken and X-XSRF-TOKEN',
      },
      {
        name: 'X-Request-ID',
        description: 'Correlates HTTP requests between a client and server.',
      },
      {
        name: 'X-Correlation-ID',
        description: 'Correlates HTTP requests between a client and server.',
      },
      {
        name: 'Save-Data',
        description:
          'The Save-Data client hint request header available in Chrome, Opera, and Yandex browsers lets developers deliver lighter, faster applications to users who opt-in to data saving mode in their browser.',
      },
    ];
  }
  return [];
});
