'use strict';

import { Messages } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';

export type ThreeDxHelloResult = {
  message: string;
};

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
/* v8 ignore next -- always-executed SDK plumbing; v8 misattributes this line as a coverage miss when the module is imported directly by a unit test */
const messages = Messages.loadMessages('@mcarvin/3dx', '3dx.hello');

export default class ThreeDxHello extends SfCommand<ThreeDxHelloResult> {
  public static override readonly summary = messages.getMessage('summary');
  public static override readonly description = messages.getMessage('description');
  public static override readonly examples = messages.getMessages('examples');

  public static override readonly flags = {
    name: Flags.string({
      summary: messages.getMessage('flags.name.summary'),
      char: 'n',
      required: false,
      default: 'World',
    }),
  };

  public async run(): Promise<ThreeDxHelloResult> {
    const { flags } = await this.parse(ThreeDxHello);
    const message = `Hello, ${flags.name}!`;
    this.log(message);
    return { message };
  }
}
