---
title: 从 Java 零基础学习里补上的编程基本功
date: 2026-07-30 10:00:00
tags: ['Java','学习笔记']
---

# 写在开头

最近我开始从 0 学 Java。

一开始以为只是换一门语法，后来发现不完全是。Java 逼着我重新看很多以前在 JS 里容易滑过去的概念：类型、对象引用、包名、编译、异常、模块、静态方法、基本类型和包装类型。

这篇不是完整教程，更像是我这段时间的学习回放。哪些地方卡过，哪些地方突然顺了，哪些 JS 习惯迁移到 Java 时需要换脑子，都记一下。

# main 方法：程序从哪里开始

Java 程序最常见的入口长这样：

```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello Java");
    }
}
```

刚开始看这一坨很烦，尤其是：

```java
public static void main(String[] args)
```

但拆开以后就没那么玄学：

- `public`：公开的，Java 运行器能找到它。
- `static`：不用先 new 对象，程序启动时可以直接调用。
- `void`：这个方法没有返回值。
- `main`：固定入口名。
- `String[] args`：命令行传进来的参数。

也就是说，真正开始执行的地方，是 `main` 里面的大括号。

# String 是对象，不是简单文本

Java 里 `String` 是一个类：

```java
String s = "Hello";
System.out.println(s);
s = s.toUpperCase();
System.out.println(s);
```

输出：

```text
Hello
HELLO
```

这里不是把原来的 `"Hello"` 改成了 `"HELLO"`，而是 `toUpperCase()` 返回了一个新字符串，再让变量 `s` 指向新的字符串。

所以 Java 里的 `String` 有一个很重要的特点：不可变。

也因为 `String` 是对象，所以比较内容不能用 `==`：

```java
String s1 = "hello";
String s2 = "HELLO".toLowerCase();

System.out.println(s1 == s2);      // false
System.out.println(s1.equals(s2)); // true
```

`==` 比的是两个变量是不是指向同一个对象，`equals()` 比的是字符串内容。

这点从 JS 切过来很容易误判。JS 里字符串是原始值，`"hello" === "hello"` 很自然；Java 里字符串虽然写法也很轻，但本质是对象。

# 单引号和双引号不是一回事

Java 里：

```java
char c = 'A';
String s = "A";
```

`char` 是单个字符，用单引号。`String` 是字符串，用双引号。

所以这个写法是错的：

```java
String s = 'hello';
```

因为单引号里只能放一个字符：

```java
char c = 'h';
```

`char` 本质上还可以看成 Unicode 编码对应的一个字符：

```java
char c = 65;
System.out.println(c); // A
```

这让我对“字符”和“字符串”终于分得更清楚了。以前在 JS 里 `'hello'` 和 `"hello"` 都是字符串，只是引号风格不同；到了 Java，这俩完全不是一回事。

# 数组变量保存的是引用

这段代码很有代表性：

```java
String[] names = {"ABC", "XYZ", "zoo"};
String s = names[1];
names[1] = "cat";
System.out.println(s);
```

输出是：

```text
XYZ
```

因为：

```java
String s = names[1];
```

只是让 `s` 指向当时的 `"XYZ"`。后面：

```java
names[1] = "cat";
```

只是把数组第二个位置改成指向 `"cat"`，不会反过来修改 `s`。

数组还有另一个坑：

```java
int[] ns = {1, 1, 2, 3, 5, 8};
System.out.println(ns);
```

打印出来不是数组内容，而是类似：

```text
[I@7852e922
```

要看内容，需要：

```java
System.out.println(Arrays.toString(ns));
```

# 复制数组，不要直接借用外部数组

这个例子让我意识到“引用”真的会影响封装：

```java
int[] scores = new int[] {88, 77, 51, 66};
Score s = new Score(scores);
s.printScores();
scores[2] = 99;
s.printScores();
```

如果 `Score` 里直接保存外面传进来的数组：

```java
class Score {
    private int[] scores;

    public Score(int[] scores) {
        this.scores = scores;
    }
}
```

外面一改，里面也跟着变。

更稳的写法是构造函数里复制一份：

```java
public Score(int[] scores) {
    this.scores = Arrays.copyOf(scores, scores.length);
}
```

这不是为了写复杂，而是为了让 `Score` 拥有自己的数据，外部代码不能随便影响它。

当时还想到过一个更简单的做法：直接把成绩转成字符串保存。

```java
class Score {
    private String scores;

    public Score(int[] scores) {
        this.scores = Arrays.toString(scores);
    }

    public void printScores() {
        System.out.println(scores);
    }
}
```

这样外部再改原来的数组，也不会影响 `Score` 里保存的内容。因为 `String` 是不可变对象。

不过这个方法只适合“只需要打印”的场景。如果以后还要算平均分、最高分、最低分，把数组变成字符串就不合适了。数字变成文字以后，再做计算会很别扭。

所以我现在会这么理解：

```java
this.scores = Arrays.toString(scores); // 简单，但只适合展示
this.scores = Arrays.copyOf(scores, scores.length); // 保留数组能力，也隔离外部修改
```

# package：src 不属于包名

我在包名这里也卡过。

如果文件路径是：

```text
src/com/itranswarp/sample/Main.java
```

包名应该是：

```java
package com.itranswarp.sample;
```

不是：

```java
package src.com.itranswarp.sample;
```

`src` 是源码根目录，不是包名的一部分。

Java 的包名推荐用倒置域名，比如：

```text
com.github.qzai666.javalearn
```

前面表示“这是谁的代码”，后面表示“这是干什么的代码”。这比随便写一个业务名更不容易冲突。

# static：先看这个方法要不要用对象自己的数据

`static` 这块我一开始也容易被“属于类，不属于对象”这句话绕住。后来换成一个更简单的判断：

```text
这个方法需要用到某个对象自己的字段吗？
```

如果不需要，它就可以是 `static`。

比如：

```java
class Greeting {
    public static String hello(String name) {
        return "Hello, " + name;
    }
}
```

这个 `hello` 方法只用到了传进来的参数 `name`，没有用到 `Greeting` 对象里的任何字段。所以调用它时，不需要先创建对象：

```java
System.out.println(Greeting.hello("xml"));
```

这就像在说：

```text
Greeting 这个类里有一个工具方法 hello，直接用就行。
```

如果写成这样：

```java
Greeting g = new Greeting();
System.out.println(g.hello("xml"));
```

代码可能还能跑，但编辑器会提示：静态方法应该用类名调用。因为这个 `g` 对象其实没有发挥作用。

另一种情况是不加 `static`：

```java
class Greeting {
    private String prefix;

    public Greeting(String prefix) {
        this.prefix = prefix;
    }

    public String hello(String name) {
        return this.prefix + ", " + name;
    }
}
```

这里的 `hello` 用到了：

```java
this.prefix
```

`this` 表示当前对象。也就是说，不同对象可以有不同的 `prefix`：

```java
Greeting g1 = new Greeting("Hello");
Greeting g2 = new Greeting("Hi");

System.out.println(g1.hello("Bob")); // Hello, Bob
System.out.println(g2.hello("Bob")); // Hi, Bob
```

这种方法就不能随便写成 `static`，因为它依赖对象自己的数据。

所以我现在先这样记：

```text
static 方法：不依赖某个对象自己的数据，用 类名.方法名 调用
普通方法：依赖对象自己的数据，先 new 对象，再用 对象.方法名 调用
```

`main` 方法为什么是 `static`，也可以从这里理解：程序刚启动时，还没有任何 `Main` 对象。Java 必须能直接通过 `Main.main(args)` 找到入口，所以 `main` 要写成 `static`。

# super：先初始化父类那部分

继承里，子类构造函数经常会看到：

```java
class Student extends Person {
    private int score;

    public Student(String name, int age, int score) {
        super(name, age);
        this.score = score;
    }
}
```

这里的：

```java
super(name, age);
```

就是调用父类 `Person` 的构造函数。

子类对象里包含父类那部分，所以创建子类时，父类要先初始化。`super(...)` 必须放在构造函数第一行。

如果你不写，Java 会默认加：

```java
super();
```

但如果父类没有无参构造函数，就会报错。

# enum：固定选项比字符串稳

星期这种值可以用字符串：

```java
String day = "SUN";
```

但更适合用枚举：

```java
enum Weekday {
    MON, TUE, WED, THU, FRI, SAT, SUN;
}

Weekday day = Weekday.SUN;
```

好处是编译器会帮你检查。写错：

```java
Weekday day = Weekday.SUNDAY;
```

直接编译不过。

如果用字符串：

```java
String day = "SUNDAY";
String day = "sun";
String day = "随便写";
```

编译都能过，问题要到运行时才暴露。

所以枚举适合表达固定范围：星期、订单状态、支付状态、用户角色。

# record：简洁的数据类

这个写法第一次看会觉得不完整：

```java
record Point(int x, int y) {}
```

但它就是完整的。

Java 会自动生成字段、构造函数、读取方法、`toString()`、`equals()`、`hashCode()`。

所以可以直接用：

```java
Point p = new Point(123, 456);
System.out.println(p.x());
System.out.println(p.y());
System.out.println(p);
```

输出：

```text
123
456
Point[x=123, y=456]
```

`record` 很适合表示“只用来装数据”的对象。

# 异常：try、catch、finally 的顺序

Java 异常体系顶层是：

```text
Throwable
├── Error
└── Exception
```

平时主要处理的是 `Exception`。

基本写法：

```java
try {
    int n = Integer.parseInt("abc");
} catch (NumberFormatException e) {
    System.out.println("不是合法数字");
}
```

多个 `catch` 会从上到下匹配，命中第一个就不再往后走：

```java
try {
    // ...
} catch (FileNotFoundException e) {
    System.out.println("文件找不到");
} catch (IOException e) {
    System.out.println("IO 错误");
}
```

顺序要从具体到宽泛，因为 `FileNotFoundException` 是 `IOException` 的子类。

如果异常没被任何 `catch` 接住，`finally` 仍然会执行：

```java
try {
    Integer.parseInt("abc");
} catch (NullPointerException e) {
    System.out.println("空指针");
} finally {
    System.out.println("执行 finally");
}
```

执行顺序是：

```text
try 出错
catch 没匹配上
finally 执行
异常继续往外抛
```

# JS 到 Java：我最需要换脑子的地方

从 JS 切到 Java，最大的变化不是语法，而是规则变硬了。

## 1. undefined 没了，null 还在

JS 里有：

```js
let name;
console.log(name); // undefined
```

Java 里没有 `undefined`。

引用类型可以是 `null`：

```java
String name = null;
```

但局部变量没初始化不能直接用：

```java
String name;
System.out.println(name); // 编译错误
```

Java 不会让“还没赋值”的局部变量悄悄变成某个默认值。

## 2. === 没了，类型检查更早发生

JS 里常用：

```js
a === b
```

Java 没有 `===`，只有 `==`。

但 Java 的类型系统更严格，很多类型不匹配的问题编译时就报错了。

基本类型：

```java
int a = 1;
int b = 1;
System.out.println(a == b); // true
```

对象类型：

```java
String a = "hello";
String b = "HELLO".toLowerCase();
System.out.println(a == b);      // false
System.out.println(a.equals(b)); // true
```

所以迁移时要记住：对象内容比较，不要顺手写 `==`。

## 3. 数组写法不一样

JS：

```js
const ns = [2, 3, 4, 5, 6];
```

Java：

```java
int[] ns = {2, 3, 4, 5, 6};
```

Java 数组有明确类型，`int[]` 就只能放整数。

## 4. 字符串和字符分开了

JS：

```js
'hello'
"hello"
```

都表示字符串。

Java：

```java
'h'      // char
"hello"  // String
```

单引号和双引号不是风格差异，而是类型差异。

## 5. 很多错误从运行时提前到了编译时

JS 里很多问题会在运行时才炸：

```js
user.name.first
```

如果 `name` 不存在，运行时才报错。

Java 更倾向于在编译阶段拦住你。比如类型不对、变量没初始化、包名路径不匹配、子类没正确调用父类构造函数，这些都很早就会红。

刚开始会觉得 Java 很啰嗦，但慢慢发现，这些红线是在逼你把关系讲清楚。

# 结尾

这段 Java 学习给我的感觉是：它不像 JS 那样灵活，但它很重视边界。

变量是什么类型，对象从哪里来，方法属于类还是对象，数组是不是被外部共享，异常有没有处理，包名和目录能不能对上，这些东西 Java 都会不断提醒你。

以前我更关注“代码能不能跑”。现在学 Java，开始更多关注“这个值到底是谁的”“这个对象到底指向哪里”“这个方法到底应该由谁调用”。

这可能就是我最近补上的一块基本功。
