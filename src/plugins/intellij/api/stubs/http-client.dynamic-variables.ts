export interface AuthVariables {
  idToken(authId: string): string;

  token(authId: string): string;
}

export interface RandomVariables {
  /**
   * <div class="content">This dynamic variable generates random sequence of uppercase and lowercase letters of length <code>length</code></div><table class="sections"><tr><td class="section" valign="top"><p>Sample value:</p></td><td valign="top"><b>aBsseEasgZ</b></td></tr><tr><td class="section" valign="top"><p>Params:</p></td><td valign="top"><p><code>length</code> &ndash; Length of the generated string. Should be greater than 0.<br/><i>Required to be <b>INTEGER</b></i></p></td></tr></table>
   */
  alphabetic(length: number): string;

  /**
   * <div class="content">This dynamic variable generates random sequence of letters, digits and <code>_</code> of length <code>length</code></div><table class="sections"><tr><td class="section" valign="top"><p>Sample value:</p></td><td valign="top"><b>wEd1Ib5Jzi</b></td></tr><tr><td class="section" valign="top"><p>Params:</p></td><td valign="top"><p><code>length</code> &ndash; Length of the generated string. Should be greater than 0.<br/><i>Required to be <b>INTEGER</b></i></p></td></tr></table>
   */
  alphanumeric(length: number): string;

  /**
   * <div class="content">This dynamic variable generates random email address</div><table class="sections"><tr><td class="section" valign="top"><p>Sample value:</p></td><td valign="top"><b>asdaf@afad.com</b></td></tr></table>
   */
  email: string;

  /**
   * <div class="content">This dynamic variable generates random float</div><table class="sections"><tr><td class="section" valign="top"><p>Sample value:</p></td><td valign="top"><b>123.12</b></td></tr><tr><td class="section" valign="top"><p><b>Versions</b></p></td></tr><tr><td class="section" valign="top"><p>(from, to)</p></td><td valign="top"><p>This version generates float between <code>from</code> and <code>to</code></p><br/><p><code>from</code> &ndash; Lower bound for a random float (inclusive).<br/><i>Required to be <b>FLOAT</b></i></p><p><code>to</code> &ndash; Upper bound for a random float (exclusive).<br/><i>Required to be <b>FLOAT</b></i></p></td></tr><tr><td class="section" valign="top"><p>(to)</p></td><td valign="top"><p>This version generates float between 0 and <code>to</code></p><br/><p><code>to</code> &ndash; Upper bound for a random float (exclusive).<br/><i>Required to be <b>FLOAT</b></i></p></td></tr><tr><td class="section" valign="top"><p>()</p></td><td valign="top"><p>This version generates float between 0 and 1000 (inclusive)</p><br/></td></tr></table>
   */
  float(from: number, to: number): string;

  /**
   * <div class="content">This dynamic variable generates random float</div><table class="sections"><tr><td class="section" valign="top"><p>Sample value:</p></td><td valign="top"><b>123.12</b></td></tr><tr><td class="section" valign="top"><p><b>Versions</b></p></td></tr><tr><td class="section" valign="top"><p>(from, to)</p></td><td valign="top"><p>This version generates float between <code>from</code> and <code>to</code></p><br/><p><code>from</code> &ndash; Lower bound for a random float (inclusive).<br/><i>Required to be <b>FLOAT</b></i></p><p><code>to</code> &ndash; Upper bound for a random float (exclusive).<br/><i>Required to be <b>FLOAT</b></i></p></td></tr><tr><td class="section" valign="top"><p>(to)</p></td><td valign="top"><p>This version generates float between 0 and <code>to</code></p><br/><p><code>to</code> &ndash; Upper bound for a random float (exclusive).<br/><i>Required to be <b>FLOAT</b></i></p></td></tr><tr><td class="section" valign="top"><p>()</p></td><td valign="top"><p>This version generates float between 0 and 1000 (inclusive)</p><br/></td></tr></table>
   */
  float(to: number): string;

  /**
   * <div class="content">This dynamic variable generates random float</div><table class="sections"><tr><td class="section" valign="top"><p>Sample value:</p></td><td valign="top"><b>123.12</b></td></tr><tr><td class="section" valign="top"><p><b>Versions</b></p></td></tr><tr><td class="section" valign="top"><p>(from, to)</p></td><td valign="top"><p>This version generates float between <code>from</code> and <code>to</code></p><br/><p><code>from</code> &ndash; Lower bound for a random float (inclusive).<br/><i>Required to be <b>FLOAT</b></i></p><p><code>to</code> &ndash; Upper bound for a random float (exclusive).<br/><i>Required to be <b>FLOAT</b></i></p></td></tr><tr><td class="section" valign="top"><p>(to)</p></td><td valign="top"><p>This version generates float between 0 and <code>to</code></p><br/><p><code>to</code> &ndash; Upper bound for a random float (exclusive).<br/><i>Required to be <b>FLOAT</b></i></p></td></tr><tr><td class="section" valign="top"><p>()</p></td><td valign="top"><p>This version generates float between 0 and 1000 (inclusive)</p><br/></td></tr></table>
   */
  float(): string;

  /**
   * <div class="content">This dynamic variable generates random hexadecimal string of length <code>length</code></div><table class="sections"><tr><td class="section" valign="top"><p>Sample value:</p></td><td valign="top"><b>A012BCF</b></td></tr><tr><td class="section" valign="top"><p>Params:</p></td><td valign="top"><p><code>length</code> &ndash; Length of generated hexadecimal string. Should be greater than 0.<br/><i>Required to be <b>INTEGER</b></i></p></td></tr></table>
   */
  hexadecimal(length: number): string;

  /**
   * <div class="content">This dynamic variable generates random integer</div><table class="sections"><tr><td class="section" valign="top"><p>Sample value:</p></td><td valign="top"><b>123</b></td></tr><tr><td class="section" valign="top"><p><b>Versions</b></p></td></tr><tr><td class="section" valign="top"><p>(from, to)</p></td><td valign="top"><p>This version generates integer between <code>from</code> and <code>to</code></p><br/><p><code>from</code> &ndash; Lower bound for a random integer (inclusive).<br/><i>Required to be <b>INTEGER</b></i></p><p><code>to</code> &ndash; Upper bound for a random integer (exclusive).<br/><i>Required to be <b>INTEGER</b></i></p></td></tr><tr><td class="section" valign="top"><p>(to)</p></td><td valign="top"><p>This version generates integer between 0 and <code>to</code></p><br/><p><code>to</code> &ndash; Upper bound for a random integer (exclusive).<br/><i>Required to be <b>INTEGER</b></i></p></td></tr><tr><td class="section" valign="top"><p>()</p></td><td valign="top"><p>This version generates integer between 0 and 1000 (inclusive)</p><br/></td></tr></table>
   */
  integer(from: number, to: number): string;

  /**
   * <div class="content">This dynamic variable generates random integer</div><table class="sections"><tr><td class="section" valign="top"><p>Sample value:</p></td><td valign="top"><b>123</b></td></tr><tr><td class="section" valign="top"><p><b>Versions</b></p></td></tr><tr><td class="section" valign="top"><p>(from, to)</p></td><td valign="top"><p>This version generates integer between <code>from</code> and <code>to</code></p><br/><p><code>from</code> &ndash; Lower bound for a random integer (inclusive).<br/><i>Required to be <b>INTEGER</b></i></p><p><code>to</code> &ndash; Upper bound for a random integer (exclusive).<br/><i>Required to be <b>INTEGER</b></i></p></td></tr><tr><td class="section" valign="top"><p>(to)</p></td><td valign="top"><p>This version generates integer between 0 and <code>to</code></p><br/><p><code>to</code> &ndash; Upper bound for a random integer (exclusive).<br/><i>Required to be <b>INTEGER</b></i></p></td></tr><tr><td class="section" valign="top"><p>()</p></td><td valign="top"><p>This version generates integer between 0 and 1000 (inclusive)</p><br/></td></tr></table>
   */
  integer(to: number): string;

  /**
   * <div class="content">This dynamic variable generates random integer</div><table class="sections"><tr><td class="section" valign="top"><p>Sample value:</p></td><td valign="top"><b>123</b></td></tr><tr><td class="section" valign="top"><p><b>Versions</b></p></td></tr><tr><td class="section" valign="top"><p>(from, to)</p></td><td valign="top"><p>This version generates integer between <code>from</code> and <code>to</code></p><br/><p><code>from</code> &ndash; Lower bound for a random integer (inclusive).<br/><i>Required to be <b>INTEGER</b></i></p><p><code>to</code> &ndash; Upper bound for a random integer (exclusive).<br/><i>Required to be <b>INTEGER</b></i></p></td></tr><tr><td class="section" valign="top"><p>(to)</p></td><td valign="top"><p>This version generates integer between 0 and <code>to</code></p><br/><p><code>to</code> &ndash; Upper bound for a random integer (exclusive).<br/><i>Required to be <b>INTEGER</b></i></p></td></tr><tr><td class="section" valign="top"><p>()</p></td><td valign="top"><p>This version generates integer between 0 and 1000 (inclusive)</p><br/></td></tr></table>
   */
  integer(): string;

  /**
   * <div class="content">This dynamic variable generates a new UUID-v4</div><table class="sections"><tr><td class="section" valign="top"><p>Sample value:</p></td><td valign="top"><b>e9e87c05-82eb-4522-bc47-f0fcfdde4cab</b></td></tr></table>
   */
  uuid: string;
}
